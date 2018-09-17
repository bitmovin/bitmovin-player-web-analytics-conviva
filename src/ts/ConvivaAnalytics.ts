///<reference path="Conviva.d.ts"/>
import { Html5Time } from './Html5Time';
import { Html5Timer } from './Html5Timer';
import { Html5Http } from './Html5Http';
import { Html5Storage } from './Html5Storage';
import { Html5Metadata } from './Html5Metadata';
import { Html5Logging } from './Html5Logging';
import ContentMetadata = Conviva.ContentMetadata;

export declare type Player = any; // TODO use player API type definitions once available

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

export class ConvivaAnalytics {

  private player: Player;
  private playerEvents: PlayerEventWrapper;
  private config: ConvivaAnalyticsConfiguration;
  private contentMetadata: ContentMetadata;
  private hasPlayingEvent: boolean;
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

    // player versions <=7.2 did not have a ON_PLAYING event
    // we track this change to correctly transition to the playing state
    this.hasPlayingEvent = Boolean(player.EVENT.ON_PLAYING);
    this.sessionDataPopulated = false;

    // Assert that this class is instantiated before player.setup() is called.
    // When instantiated later, we cannot detect startup error events because they are fired during setup.
    if (player.isReady()) {
      console.error('ConvivaAnalytics must be instantiated before calling player.setup()');
      return; // Cancel initialization
    }

    this.player = player;
    this.playerEvents = new PlayerEventWrapper(player);
    this.config = config;

    // Set default config values
    this.config.debugLoggingEnabled = this.config.debugLoggingEnabled || false;

    this.logger = new Html5Logging();
    this.sessionKey = Conviva.Client.NO_SESSION_KEY;
    this.isAd = false;

    let systemInterface = new Conviva.SystemInterface(
      new Html5Time(),
      new Html5Timer(),
      new Html5Http(),
      new Html5Storage(),
      new Html5Metadata(),
      this.logger
    );

    let systemSettings = new Conviva.SystemSettings();
    this.systemFactory = new Conviva.SystemFactory(systemInterface, systemSettings);

    let clientSettings = new Conviva.ClientSettings(customerKey);

    if (config.gatewayUrl) {
      clientSettings.gatewayUrl = config.gatewayUrl;
    }

    this.client = new Conviva.Client(clientSettings, this.systemFactory);

    this.playerStateManager = this.client.getPlayerStateManager();
    this.playerStateManager.setPlayerType('Bitmovin Player');
    this.playerStateManager.setPlayerVersion(player.version);

    this.registerPlayerEvents();
  }

  private debugLog(message?: any, ...optionalParams: any[]): void {
    if (this.config.debugLoggingEnabled) {
      console.log.apply(console, arguments);
    }
  }

  private getUrlFromSource(source: any): string {
    if (!source) {
      return 'undefined';
    }
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
   *  - defaultBitrateKbps (unused)
   *  - encodedFrameRate (unused)
   */
  private initializeSession() {
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
    let source = this.player.getConfig().source;

    this.contentMetadata.applicationName = this.config.applicationName || 'Unknown (no config.applicationName set)';
    this.contentMetadata.assetName = this.getAssetName(source);
    this.contentMetadata.viewerId = source.viewerId || this.config.viewerId || null;
    this.contentMetadata.duration = this.player.getDuration();
    this.contentMetadata.streamType =
      this.player.isLive() ? Conviva.ContentMetadata.StreamType.LIVE : Conviva.ContentMetadata.StreamType.VOD;

    this.contentMetadata.custom = {
      'playerType': this.player.getPlayerType(),
      'streamType': this.player.getStreamType(),
      'vrContentType': this.player.getVRStatus().contentType,
      ...this.config.customTags,
    };
  }

  /**
   * Update contentMetadata which are allowed during the session
   */
  private updateSession() {
    if (!this.isValidSession()) {
      return;
    }
    this.contentMetadata.streamUrl = this.getUrlFromSource(this.player.getConfig().source); // TODO: mid Meta data available
    this.client.updateContentMetadata(this.sessionKey, this.contentMetadata);
  }

  private getAssetName(source: any): string {
    if (!source) {
      return 'undefined';
    }
    let assetName;

    let assetId = source.contentId ? `[${source.contentId}]` : undefined;
    let assetTitle = source.title;

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

  private endSession = (event?: any) => {
    this.debugLog('endsession', this.sessionKey, event);
    this.client.detachPlayer(this.sessionKey);
    this.client.cleanupSession(this.sessionKey);
    this.sessionKey = Conviva.Client.NO_SESSION_KEY;
    this.sessionDataPopulated = false;
  };

  private isValidSession(): boolean {
    return this.sessionKey !== Conviva.Client.NO_SESSION_KEY;
  }

  private onSourceLoaded = () => {
    if (this.isAd) {
      // Ignore ON_SOURCE_LOADED events during ad playback, because that's just an ad being temporarily loaded
      // instead of the actual source.
      return;
    }

    // in case a source has been loaded after an source_unloaded initialize a new session
    if (!this.isValidSession()) {
      this.initializeSession();
    }
  };

  private onReady = (event: any) => {
    this.debugLog('ready', event);

    // initialize if not yet initialized but only when a not empty source is present
    const source = this.player.getConfig().source;
    const isSourcePresent = source && Object.keys(source).length > 0;
    if (!this.isValidSession() && isSourcePresent) {
      this.initializeSession();
    }
  };

  private onPlaybackStateChanged = (event?: any) => {
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

  private onPlay = (event: any) => {
    this.debugLog('play', event);

    // in case the playback has finished and the user replays the stream create a new session
    if (!this.isValidSession()) {
      this.initializeSession();
    }

    if (!this.hasPlayingEvent) {
      this.updateSession();
    }
  };

  private onPlaying = (event: any) => {
    this.playbackStarted = true;
    this.debugLog('playing', event);
    this.updateSession();
    this.onPlaybackStateChanged(event);
  };

  // When the first ON_TIME_CHANGED event arrives, the loading phase is finished and actual playback has started
  private onTimeChanged = (event: any) => {
    if (this.isValidSession() && !this.playbackStarted) {
      // fallback for player versions <= 7.2 which do not support ON_PLAYING Event
      this.onPlaying(event);
    }
  };

  private onPlaybackFinished = (event: any) => {
    this.debugLog('playbackfinished', event);
    this.onPlaybackStateChanged(event);
    this.endSession(event);
  };

  private onSeek = (event: any) => {
    this.playerStateManager.setPlayerSeekStart(Math.round(event.seekTarget * 1000));
  };

  private onSeeked = () => {
    this.playerStateManager.setPlayerSeekEnd();
  };

  private onVideoQualityChanged = (event: any) => {
    // We calculate the bitrate with a divisor of 1000 so the values look nicer
    // Example: 250000 / 1000 => 250 kbps (250000 / 1024 => 244kbps)
    let bitrateKbps = Math.round(event.targetQuality.bitrate / 1000);
    console.warn('go video quality changed ', this.sessionKey, bitrateKbps);

    this.playerStateManager.setBitrateKbps(bitrateKbps);
  };

  private onCustomEvent = (event: any) => {
    if (!this.isValidSession()) {
      this.debugLog('skip custom event, no session existing', event);
      return;
    }

    let eventAttributes: EventAttributes = {};

    // Flatten the event object into a string-to-string dictionary with the object property hierarchy in dot notation
    let objectWalker = (object: any, prefix: string = '') => {
      for (let key in object) {
        if (object.hasOwnProperty(key)) {
          let value = object[key];
          if (typeof value === 'object') {
            objectWalker(value, prefix + key + '.');
          } else {
            eventAttributes[prefix + key] = String(value);
          }
        }
      }
    };
    objectWalker(event);

    this.sendCustomPlaybackEvent(event.type, eventAttributes);
  };

  private onAdStarted = (event: any) => {
    this.isAd = true;
    this.debugLog('adstart', event);
    let adPosition = Conviva.Client.AdPosition.MIDROLL;

    switch (event.timeOffset) {
      case 'pre':
        adPosition = Conviva.Client.AdPosition.PREROLL;
        break;
      case 'post':
        adPosition = Conviva.Client.AdPosition.POSTROLL;
        break;
    }

    if (!this.isValidSession()) {
      // Don't report without a valid session (e.g. in case of a post-roll ad)
      return;
    }

    this.client.adStart(this.sessionKey, Conviva.Client.AdStream.SEPARATE, Conviva.Client.AdPlayer.CONTENT, adPosition);
    this.onPlaybackStateChanged();
  };

  private onAdSkipped = (event: any) => {
    this.onCustomEvent(event);
    this.onAdFinished(event);
  };

  private onAdError = (event: any) => {
    this.onCustomEvent(event);
    this.onAdFinished(event);
  };

  private onAdFinished = (event?: any) => {
    this.isAd = false;
    this.debugLog('adend', event);

    if (!this.isValidSession()) {
      // Don't report without a valid session (e.g. in case of a post-roll ad)
      return;
    }

    this.client.adEnd(this.sessionKey);
    this.onPlaybackStateChanged();
  };

  private onError = (event: any) => {
    this.client.reportError(this.sessionKey, String(event.code) + ' ' + event.message,
      Conviva.Client.ErrorSeverity.FATAL);
    this.endSession();
  };

  private onSourceUnloaded = (event: any) => {
    if (this.isAd) {
      // Ignore ON_SOURCE_UNLOADED events while
      return;
    }

    this.endSession(event);
  };

  private registerPlayerEvents(): void {
    let player = this.player;
    let playerEvents = this.playerEvents;
    playerEvents.add(player.EVENT.ON_SOURCE_LOADED, this.onSourceLoaded);
    playerEvents.add(player.EVENT.ON_READY, this.onReady);
    playerEvents.add(player.EVENT.ON_PLAY, this.onPlay);
    playerEvents.add(player.EVENT.ON_PLAYING, this.onPlaying);
    playerEvents.add(player.EVENT.ON_TIME_CHANGED, this.onTimeChanged);
    playerEvents.add(player.EVENT.ON_PAUSED, this.onPlaybackStateChanged);
    playerEvents.add(player.EVENT.ON_STALL_STARTED, this.onPlaybackStateChanged);
    playerEvents.add(player.EVENT.ON_STALL_ENDED, this.onPlaybackStateChanged);
    playerEvents.add(player.EVENT.ON_PLAYBACK_FINISHED, this.onPlaybackFinished);
    playerEvents.add(player.EVENT.ON_SEEK, this.onSeek);
    playerEvents.add(player.EVENT.ON_SEEKED, this.onSeeked);
    playerEvents.add(player.EVENT.ON_VIDEO_PLAYBACK_QUALITY_CHANGED, this.onVideoQualityChanged);
    playerEvents.add(player.EVENT.ON_AUDIO_PLAYBACK_QUALITY_CHANGED, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_MUTED, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_UNMUTED, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_FULLSCREEN_ENTER, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_FULLSCREEN_EXIT, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_CAST_STARTED, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_CAST_STOPPED, this.onCustomEvent);
    playerEvents.add(player.EVENT.ON_AD_STARTED, this.onAdStarted);
    playerEvents.add(player.EVENT.ON_AD_FINISHED, this.onAdFinished);
    playerEvents.add(player.EVENT.ON_AD_SKIPPED, this.onAdSkipped);
    playerEvents.add(player.EVENT.ON_AD_ERROR, this.onAdError);
    playerEvents.add(player.EVENT.ON_SOURCE_UNLOADED, this.onSourceUnloaded);
    playerEvents.add(player.EVENT.ON_ERROR, this.onError);
  }

  private unregisterPlayerEvents(): void {
    this.playerEvents.clear();
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.client.sendCustomEvent(Conviva.Client.NO_SESSION_KEY, eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    // Check for active session
    if (!this.isValidSession()) {
      this.logger.consoleLog('cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING);
      return;
    }

    this.client.sendCustomEvent(this.sessionKey, eventName, eventAttributes);
  }

  release(): void {
    this.unregisterPlayerEvents();
    this.endSession();
    this.client.releasePlayerStateManager(this.playerStateManager);
    this.client.release();
    this.systemFactory.release();
  }
}

class PlayerEventWrapper {

  private player: Player;
  private eventHandlers: { [eventType: string]: ((event?: any) => void)[]; };

  constructor(player: Player) {
    this.player = player;
    this.eventHandlers = {};
  }

  add(eventType: string, callback: (event?: any) => void): void {
    this.player.addEventHandler(eventType, callback);

    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
  }

  remove(eventType: string, callback: (event?: any) => void): void {
    this.player.removeEventHandler(eventType, callback);

    if (this.eventHandlers[eventType]) {
      ArrayUtils.remove(this.eventHandlers[eventType], callback);
    }
  }

  clear(): void {
    for (let eventType in this.eventHandlers) {
      for (let callback of this.eventHandlers[eventType]) {
        this.player.removeEventHandler(eventType, callback);
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
    let index = array.indexOf(item);

    if (index > -1) {
      return array.splice(index, 1)[0];
    } else {
      return null;
    }
  }
}