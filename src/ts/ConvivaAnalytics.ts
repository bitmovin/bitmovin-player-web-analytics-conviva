type ContentMetadata = Conviva.ContentMetadata;
import {
  AdBreak,
  AdBreakEvent,
  ErrorEvent,
  PlaybackEvent,
  PlayerAPI,
  PlayerEvent,
  PlayerEventBase,
  SourceConfig,
  VideoQualityChangedEvent,
} from 'bitmovin-player';
import { Html5Http } from './Html5Http';
import { Html5Logging } from './Html5Logging';
import { Html5Metadata } from './Html5Metadata';
import { Html5Storage } from './Html5Storage';
import { Html5Time } from './Html5Time';
import { Html5Timer } from './Html5Timer';

type Player = PlayerAPI;

export interface ConvivaAnalyticsConfiguration {
  /**
   * Enables debug logging when set to true (default: false).
   */
  debugLoggingEnabled?: boolean;
  /**
   * The TOUCHSTONE_SERVICE_URL for testing with Touchstone. Only to be used for development, must not be set in
   * production or automated testing.
   */
  gatewayUrl?: string;
  /**
   * A string value used to distinguish individual apps, players, locations, platforms, and/or deployments.
   */
  applicationName?: string;
  /**
   * A unique identifier to distinguish individual viewers/subscribers and their watching experience through
   * Conviva's Viewers Module in Pulse.
   * Can also be set in the source config of the player, which will take precedence over this value.
   */
  viewerId?: string;

  /**
   * A key-value map to send customer specific custom tags.
   */
  customTags?: { [key: string]: any };
}

export interface EventAttributes {
  [key: string]: string;
}

export interface ConvivaSourceConfig extends SourceConfig {
  viewerId?: string
  contentId?: string;
}

export class ConvivaAnalytics {

  private static readonly VERSION: string = '{{VERSION}}';

  private player: Player;
  private events: typeof PlayerEvent;
  private handlers: PlayerEventWrapper;
  private config: ConvivaAnalyticsConfiguration;
  private contentMetadata: ContentMetadata;
  private sessionDataPopulated: boolean;

  private systemFactory: Conviva.SystemFactory;
  private client: Conviva.Client;
  private playerStateManager: Conviva.PlayerStateManager;

  private logger: Conviva.LoggingInterface;
  private sessionKey: number;

  /**
   * Tracks the ad playback status and is true between ON_AD_STARTED and ON_AD_FINISHED/SKIPPED/ERROR.
   * This flag is required because player.isAd() is unreliable and not always true between the events.
   */
  private isAd: boolean;

  private playbackStarted: boolean;

  constructor(player: Player, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    if (typeof Conviva === 'undefined') {
      console.error('Conviva script missing, cannot init ConvivaAnalytics. '
        + 'Please load the Conviva script (conviva-core-sdk.min.js) before Bitmovin\'s ConvivaAnalytics integration.');
      return; // Cancel initialization
    }

    if (player.getSource()) {
      console.error('Bitmovin Conviva integration must be instantiated before calling player.load()');
      return; // Cancel initialization
    }

    this.sessionDataPopulated = false;

    this.player = player;

    // TODO: Use alternative to deprecated player.exports
    this.events = player.exports.PlayerEvent;

    this.handlers = new PlayerEventWrapper(player);
    this.config = config;

    // Set default config values
    this.config.debugLoggingEnabled = this.config.debugLoggingEnabled || false;

    this.logger = new Html5Logging();
    this.sessionKey = Conviva.Client.NO_SESSION_KEY;
    this.isAd = false;

    const systemInterface = new Conviva.SystemInterface(
      new Html5Time(),
      new Html5Timer(),
      new Html5Http(),
      new Html5Storage(),
      new Html5Metadata(),
      this.logger,
    );

    const systemSettings = new Conviva.SystemSettings();
    this.systemFactory = new Conviva.SystemFactory(systemInterface, systemSettings);

    const clientSettings = new Conviva.ClientSettings(customerKey);

    if (config.gatewayUrl) {
      clientSettings.gatewayUrl = config.gatewayUrl;
    }

    this.client = new Conviva.Client(clientSettings, this.systemFactory);

    this.registerPlayerEvents();
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.client.sendCustomEvent(Conviva.Client.NO_SESSION_KEY, eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    // Check for active session
    if (!this.isValidSession()) {
      this.logger.consoleLog('cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING);
      return;
    }

    this.client.sendCustomEvent(this.sessionKey, eventName, eventAttributes);
  }

  public release(): void {
    this.destroy();
  }

  private destroy(event?: PlayerEventBase): void {
    this.unregisterPlayerEvents();
    this.endSession(event);
    this.client.release();
    this.systemFactory.release();
  }

  private debugLog(message?: any, ...optionalParams: any[]): void {
    if (this.config.debugLoggingEnabled) {
      console.log.apply(console, arguments);
    }
  }

  private getUrlFromSource(source: ConvivaSourceConfig): string {
    switch (this.player.getStreamType()) {
      case 'dash':
        return source.dash;
      case 'hls':
        return source.hls;
      case 'progressive':
        if (Array.isArray(source.progressive)) {
          // TODO check if the first stream can be another index (e.g. ordered by bitrate), and select the current
          // startup url
          return source.progressive[0].url;
        } else {
          return source.progressive;
        }
    }
  }

  /**
   * A Conviva Session should only be initialized when there is a source provided in the player because
   * Conviva only allows to update different `contentMetadata` only at different times
   *
   * Set only once:
   *  - assetName
   *
   * Update before first video frame:
   *  - viewerId
   *  - streamType
   *  - playerName
   *  - duration
   *  - custom
   *
   * Multiple updates during session:
   *  - streamUrl
   *  - defaultResource (unused)
   *  - encodedFrameRate (unused)
   */
  private initializeSession() {
    // initialize PlayerStateManager
    this.playerStateManager = this.client.getPlayerStateManager();
    this.playerStateManager.setPlayerType('Bitmovin Player');
    this.playerStateManager.setPlayerVersion(this.player.version);

    this.contentMetadata = new Conviva.ContentMetadata();
    this.buildContentMetadata();

    // Create a Conviva monitoring session.
    this.sessionKey = this.client.createSession(this.contentMetadata); // this will make the initial request

    if (!this.isValidSession()) {
      // Something went wrong. With stable system interfaces, this should never happen.
      this.logger.consoleLog('Something went wrong, could not obtain session key',
        Conviva.SystemSettings.LogLevel.ERROR);
    }

    this.playerStateManager.setPlayerState(Conviva.PlayerStateManager.PlayerState.STOPPED);
    this.client.attachPlayer(this.sessionKey, this.playerStateManager);
    this.debugLog('startsession', this.sessionKey);
  }

  /**
   * Update contentMetadata which must be present before first video frame
   */
  private buildContentMetadata() {
    const source = this.player.getSource() as ConvivaSourceConfig;

    this.contentMetadata.applicationName = this.config.applicationName || 'Unknown (no config.applicationName set)';
    this.contentMetadata.assetName = this.getAssetName(source);
    this.contentMetadata.viewerId = source.viewerId || this.config.viewerId || null;
    this.contentMetadata.duration = this.player.getDuration();
    this.contentMetadata.streamType =
      this.player.isLive() ? Conviva.ContentMetadata.StreamType.LIVE : Conviva.ContentMetadata.StreamType.VOD;

    this.contentMetadata.custom = {
      playerType: this.player.getPlayerType(),
      streamType: this.player.getStreamType(),
      vrContentType: source.vr && source.vr.contentType,
      // Autoplay and preload are important options for the Video Startup Time so we track it as custom tags
      autoplay: PlayerConfigHelper.getAutoplayConfig(this.player) + '',
      preload: PlayerConfigHelper.getPreloadConfig(this.player) + '',
      integrationVersion: ConvivaAnalytics.VERSION,
      ...this.config.customTags,
    };

    // also include dynamic content metadata at initial creation
    this.buildDynamicContentMetadata();
  }

  /**
   * Update contentMetadata which are allowed during the session
   */
  private buildDynamicContentMetadata() {
    const source = this.player.getSource();
    this.contentMetadata.streamUrl = this.getUrlFromSource(source);
  }

  private updateSession() {
    if (!this.isValidSession()) {
      return;
    }
    this.buildDynamicContentMetadata();
    this.client.updateContentMetadata(this.sessionKey, this.contentMetadata);
  }

  private getAssetName(source: ConvivaSourceConfig): string {
    let assetName;

    const assetId = source.contentId ? `[${source.contentId}]` : undefined;
    const assetTitle = source.title;

    if (assetId && assetTitle) {
      assetName = `${assetId} ${assetTitle}`;
    } else if (assetId && !assetTitle) {
      assetName = assetId;
    } else if (assetTitle && !assetId) {
      assetName = assetTitle;
    } else {
      assetName = 'Untitled (no source.title/source.contentId set)';
    }
    return assetName;
  }

  private endSession = (event?: PlayerEventBase) => {
    this.debugLog('endsession', this.sessionKey, event);
    this.client.detachPlayer(this.sessionKey);
    this.client.cleanupSession(this.sessionKey);
    this.client.releasePlayerStateManager(this.playerStateManager);

    this.sessionKey = Conviva.Client.NO_SESSION_KEY;
    this.sessionDataPopulated = false;
  };

  private isValidSession(): boolean {
    return this.sessionKey !== Conviva.Client.NO_SESSION_KEY;
  }

  private onPlaybackStateChanged = (event?: PlayerEventBase) => {
    if (this.isAd) {
      // Do not track playback state changes during ad (e.g. triggered from IMA)
      return;
    }

    this.debugLog('reportplaybackstate', event);

    let playerState;

    if (this.player.isStalled()) {
      playerState = Conviva.PlayerStateManager.PlayerState.BUFFERING;
    } else if (this.player.isPaused()) {
      playerState = Conviva.PlayerStateManager.PlayerState.PAUSED;
    } else if (this.player.isPlaying()) {
      playerState = Conviva.PlayerStateManager.PlayerState.PLAYING;
    } else if (this.player.hasEnded()) {
      playerState = Conviva.PlayerStateManager.PlayerState.STOPPED;
    }

    if (playerState) {
      this.playerStateManager.setPlayerState(playerState);
    }
  };

  private onPlay = (event: PlaybackEvent) => {
    this.debugLog('play', event);
    if (this.isAd) {
      // Do not track play event during ad (e.g. triggered from IMA)
      return;
    }

    // in case the playback has finished and the user replays the stream create a new session
    if (!this.isValidSession()) {
      this.initializeSession();
    }
  };

  private onPlaying = (event: PlaybackEvent) => {
    this.playbackStarted = true;
    this.debugLog('playing', event);
    this.updateSession();
    this.onPlaybackStateChanged(event);
  };

  // When the first ON_TIME_CHANGED event arrives, the loading phase is finished and actual playback has started
  private onTimeChanged = (event: PlaybackEvent) => {
    if (this.isValidSession() && !this.playbackStarted) {
      // fallback for player versions <= 7.2 which do not support ON_PLAYING Event
      this.onPlaying(event);
    }
  };

  private onPlaybackFinished = (event: PlayerEventBase) => {
    this.debugLog('playbackfinished', event);
    this.onPlaybackStateChanged(event);
    this.endSession(event);
  };

  private onVideoQualityChanged = (event: VideoQualityChangedEvent) => {
    if (!this.isValidSession()) {
      return;
    }
    // We calculate the bitrate with a divisor of 1000 so the values look nicer
    // Example: 250000 / 1000 => 250 kbps (250000 / 1024 => 244kbps)
    const bitrateKbps = Math.round(event.targetQuality.bitrate / 1000);
    console.warn('go video quality changed ', this.sessionKey, bitrateKbps);

    this.playerStateManager.setBitrateKbps(bitrateKbps);
  };

  private onCustomEvent = (event: PlayerEventBase) => {
    if (!this.isValidSession()) {
      this.debugLog('skip custom event, no session existing', event);
      return;
    }

    const eventAttributes = ObjectUtils.flatten(event);
    this.sendCustomPlaybackEvent(event.type, eventAttributes);
  };

  private onAdBreakStarted = (event: AdBreakEvent) => {
    this.isAd = true;

    const adPosition = this.mapAdPosition(event.adBreak);

    if (!this.isValidSession()) {
      // Don't report without a valid session (e.g., in case of a pre-roll, or post-roll ad)
      return;
    }

    this.debugLog('adbreakstart', event);
    this.client.adStart(this.sessionKey, Conviva.Client.AdStream.SEPARATE, Conviva.Client.AdPlayer.CONTENT, adPosition);
    this.onPlaybackStateChanged();
  };

  private mapAdPosition(adBreak: AdBreak): Conviva.Client.AdPosition {
    if (adBreak.scheduleTime <= 0) {
      return Conviva.Client.AdPosition.PREROLL;
    }

    if (adBreak.scheduleTime >= this.player.getDuration()) {
      return Conviva.Client.AdPosition.POSTROLL;
    }

    return Conviva.Client.AdPosition.MIDROLL;
  }

  private onAdBreakFinished = (event: AdBreakEvent | ErrorEvent) => {
    this.isAd = false;


    if (!this.isValidSession()) {
      // Don't report without a valid session (e.g., in case of a pre-roll, or post-roll ad)
      return;
    }

    this.debugLog('adbreakfinished', event);
    this.client.adEnd(this.sessionKey);
    this.onPlaybackStateChanged();
  };

  private onError = (event: ErrorEvent) => {
    if (!this.isValidSession()) {
      // initialize Session if not yet initialized to capture Video Start Failures
      this.initializeSession();
    }

    this.client.reportError(
      this.sessionKey,
      `${String(event.code)} ${event.name}`,
      Conviva.Client.ErrorSeverity.FATAL
    );

    this.endSession();
  };

  private onSourceUnloaded = (event: PlayerEventBase) => {
    if (this.isAd) {
      // Ignore ON_SOURCE_UNLOADED events while
      return;
    }

    this.endSession(event);
  };

  private onDestroy = (event: any) => {
    this.destroy(event);
  };

  private registerPlayerEvents(): void {
    const playerEvents = this.handlers;

    playerEvents.add(this.events.Play, this.onPlay);
    playerEvents.add(this.events.Playing, this.onPlaying);
    playerEvents.add(this.events.TimeChanged, this.onTimeChanged);
    playerEvents.add(this.events.Paused, this.onPlaybackStateChanged);
    playerEvents.add(this.events.StallStarted, this.onPlaybackStateChanged);
    playerEvents.add(this.events.StallEnded, this.onPlaybackStateChanged);
    playerEvents.add(this.events.PlaybackFinished, this.onPlaybackFinished);
    playerEvents.add(this.events.VideoPlaybackQualityChanged, this.onVideoQualityChanged);
    playerEvents.add(this.events.AudioPlaybackQualityChanged, this.onCustomEvent);
    playerEvents.add(this.events.Muted, this.onCustomEvent);
    playerEvents.add(this.events.Unmuted, this.onCustomEvent);
    playerEvents.add(this.events.ViewModeChanged, this.onCustomEvent);
    playerEvents.add(this.events.CastStarted, this.onCustomEvent);
    playerEvents.add(this.events.CastStopped, this.onCustomEvent);
    playerEvents.add(this.events.AdBreakStarted, this.onAdBreakStarted);
    playerEvents.add(this.events.AdBreakFinished, this.onAdBreakFinished);
    playerEvents.add(this.events.SourceUnloaded, this.onSourceUnloaded);
    playerEvents.add(this.events.Error, this.onError);
    playerEvents.add(this.events.Destroy, this.onDestroy);
  }

  private unregisterPlayerEvents(): void {
    this.handlers.clear();
  }

  static get version(): string {
    return ConvivaAnalytics.VERSION;
  }
}

class PlayerConfigHelper {
  /**
   * The config for autoplay and preload have great impact to the VST (Video Startup Time) we track it.
   * Since there is no way to get default config values from the player they are hardcoded.
   */
  public static AUTOPLAY_DEFAULT_CONFIG: boolean = false;

  /**
   * Extract autoplay config form player
   *
   * @param player: Player
   */
  public static getAutoplayConfig(player: Player): boolean {
    const playerConfig = player.getConfig();

    if (playerConfig.playback && playerConfig.playback.autoplay !== undefined) {
      return playerConfig.playback.autoplay;
    } else {
      return PlayerConfigHelper.AUTOPLAY_DEFAULT_CONFIG;
    }
  }

  /**
   * Extract preload config from player
   *
   * The preload config can be set individual for mobile or desktop as well as on root level for both platforms.
   * Default value is true for VOD and false for live streams. If the value is not set for current platform or on root
   * level the default value will be used over the value for the other platform.
   *
   * @param player: Player
   */
  public static getPreloadConfig(player: Player): boolean {
    const playerConfig = player.getConfig();

    if (BrowserUtils.isMobile()) {
      if (playerConfig.adaptation
          && playerConfig.adaptation.mobile
          && playerConfig.adaptation.mobile.preload !== undefined) {
        return playerConfig.adaptation.mobile.preload;
      }
    } else {
      if (playerConfig.adaptation
          && playerConfig.adaptation.desktop
          && playerConfig.adaptation.desktop.preload !== undefined) {
        return playerConfig.adaptation.desktop.preload;
      }
    }

    if (playerConfig.adaptation
        && playerConfig.adaptation.preload !== undefined) {
      return playerConfig.adaptation.preload
    }

    return !player.isLive();
  }
}

class PlayerEventWrapper {

  private player: Player;
  private readonly eventHandlers: { [eventType: string]: Array<(event?: PlayerEventBase) => void>; };

  constructor(player: Player) {
    this.player = player;
    this.eventHandlers = {};
  }

  public add(eventType: PlayerEvent, callback: (event?: PlayerEventBase) => void): void {
    this.player.on(eventType, callback);

    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
  }

  public remove(eventType: PlayerEvent, callback: (event?: PlayerEventBase) => void): void {
    this.player.off(eventType, callback);

    if (this.eventHandlers[eventType]) {
      ArrayUtils.remove(this.eventHandlers[eventType], callback);
    }
  }

  public clear(): void {
    for (const eventType in this.eventHandlers) {
      for (const callback of this.eventHandlers[eventType]) {
        this.remove(eventType as PlayerEvent, callback);
      }
    }
  }
}

/**
 * Extracted from bitmovin-player-ui
 */
namespace ArrayUtils {
  /**
   * Removes an item from an array.
   * @param array the array that may contain the item to remove
   * @param item the item to remove from the array
   * @returns {any} the removed item or null if it wasn't part of the array
   */
  export function remove<T>(array: T[], item: T): T | null {
    const index = array.indexOf(item);

    if (index > -1) {
      return array.splice(index, 1)[0];
    } else {
      return null;
    }
  }
}

namespace ObjectUtils {
  export function flatten(object: any, prefix: string = '') {
    const eventAttributes: EventAttributes = {};

    // Flatten the event object into a string-to-string dictionary with the object property hierarchy in dot notation
    const objectWalker = (object: any, prefix: string) => {
      for (const key in object) {
        if (object.hasOwnProperty(key)) {
          const value = object[key];
          if (typeof value === 'object') {
            objectWalker(value, prefix + key + '.');
          } else {
            eventAttributes[prefix + key] = String(value);
          }
        }
      }
    };

    return eventAttributes;
  }
}

class BrowserUtils {
  public static isMobile(): boolean {
    const isAndroid: boolean = /Android/i.test(navigator.userAgent);
    const isIEMobile: boolean = /IEMobile/i.test(navigator.userAgent);
    const isEdgeMobile: boolean = /Windows Phone 10.0/i.test(navigator.userAgent);
    const isMobileSafari: boolean = /Safari/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
    return isAndroid || isIEMobile || isEdgeMobile || isMobileSafari;
  }
}

export default ConvivaAnalytics;
