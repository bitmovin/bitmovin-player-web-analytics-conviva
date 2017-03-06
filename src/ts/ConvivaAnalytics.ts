///<reference path="Conviva.d.ts"/>
import {Html5Time} from './Html5Time';
import {Html5Timer} from './Html5Timer';
import {Html5Http} from './Html5Http';
import {Html5Storage} from './Html5Storage';
import {Html5Metadata} from './Html5Metadata';
import {Html5Logging} from './Html5Logging';

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
}

export interface EventAttributes {
  [key: string]: string;
}

export class ConvivaAnalytics {

  private player: Player;
  private playerEvents: PlayerEventWrapper;
  private config: ConvivaAnalyticsConfiguration;

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

  /**
   * Tracks the playback finished status and is true between ON_PLAYBACK_FINISHED and ON_PLAY.
   * This flag is required because player.hasEnded() is unreliable and not always true after playback has finished
   * (e.g. after a post-roll ad).
   */
  private isPlaybackFinished: boolean;

  constructor(player: Player, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    if (typeof Conviva === 'undefined') {
      console.error('Conviva script missing, cannot init ConvivaAnalytics. '
        + 'Please load the Conviva script (conviva-core-sdk.min.js) before Bitmovin\'s ConvivaAnalytics integration.');
      return; // Cancel initialization
    }

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
    this.isPlaybackFinished = false;

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

  private startSession = (event?: any) => {
    let source = this.player.getConfig().source;

    let assetId = source.contentId ? `[${source.contentId}]` : undefined;
    let assetTitle = source.title;
    let assetName;

    if (assetId && assetTitle) {
      assetName = `${assetId} ${assetTitle}`;
    } else if (assetId && !assetTitle) {
      assetName = assetId;
    } else if (assetTitle && !assetId) {
      assetName = assetTitle;
    } else {
      assetName = 'Untitled (no source.title/source.contentId set)';
    }

    // Create a ContentMetadata object and supply relevant metadata for the requested content.
    let contentMetadata = new Conviva.ContentMetadata();
    contentMetadata.assetName = assetName;
    contentMetadata.viewerId = source.viewerId || this.config.viewerId || null;
    contentMetadata.applicationName = this.config.applicationName || 'Unknown (no config.applicationName set)';
    contentMetadata.duration = this.player.getDuration(); // TODO how to handle HLS Chrome deferred duration detection?
    contentMetadata.streamType = this.player.isLive() ? Conviva.ContentMetadata.StreamType.LIVE // TODO how to handle HLS deferred live detection?
      : Conviva.ContentMetadata.StreamType.VOD;
    contentMetadata.streamUrl = this.getUrlFromSource(source);
    contentMetadata.custom = {
      'playerType': this.player.getPlayerType(),
      'streamType': this.player.getStreamType(),
      'vrContentType': this.player.getVRStatus().contentType,
    };

    this.onPlaybackStateChanged();

    // Create a Conviva monitoring session.
    this.sessionKey = this.client.createSession(contentMetadata);

    if (this.sessionKey === Conviva.Client.NO_SESSION_KEY) {
      // Something went wrong. With stable system interfaces, this should never happen.
      this.logger.consoleLog('Something went wrong, could not obtain session key',
        Conviva.SystemSettings.LogLevel.ERROR);
    }

    this.client.attachPlayer(this.sessionKey, this.playerStateManager);
    this.debugLog('startsession', this.sessionKey, event);
  };

  private endSession = (event?: any) => {
    this.debugLog('endsession', this.sessionKey, event);
    this.client.detachPlayer(this.sessionKey);
    this.client.cleanupSession(this.sessionKey);
  };

  private onSourceLoaded = (event: any) => {
    if (this.isAd) {
      // Ignore ON_SOURCE_LOADED events during ad playback, because that's just an ad being temporarily loaded
      // instead of the actual source.
      return;
    }

    if (this.sessionKey !== Conviva.Client.NO_SESSION_KEY) {
      // Do not start a new session when a session is already existing
      // Happens after ad playback, when the actual source is restored and an ON_SOURCE_LOADED event issued. Because
      // we suppress the ON_SOURCE_UNLOADED event which unloads the temporary ad source, we must also ignore this
      // event. By ignoring these ad-induced events, we end up with a clean ON_SOURCE_LOADED/ON_SOURCE_UNLOADED
      // sequence which only concerns the actual source.
      return;
    }

    this.startSession(event);
  };

  private onPlaybackStateChanged = (event?: any) => {
    this.debugLog('reportplaybackstate', event);
    let playerState = Conviva.PlayerStateManager.PlayerState.UNKNOWN;

    if ((!this.player.isPlaying() && !this.player.isPaused()) || this.player.hasEnded()) {
      // Before playback has started, and after it is finished, we report the stopped state
      playerState = Conviva.PlayerStateManager.PlayerState.STOPPED;
    } else if (this.player.isStalled()) {
      playerState = Conviva.PlayerStateManager.PlayerState.BUFFERING;
    } else if (this.player.isPlaying()) {
      playerState = Conviva.PlayerStateManager.PlayerState.PLAYING;
    } else if (this.player.isPaused()) {
      playerState = Conviva.PlayerStateManager.PlayerState.PAUSED;
    }

    this.playerStateManager.setPlayerState(playerState);
  };

  private onPlay = (event: any) => {
    if (this.isPlaybackFinished) {
      // A play after playback has finished indicates a restart, for which we need a new session (Conviva specification)
      this.isPlaybackFinished = false;
      // Start a new session (also updates the playback state)
      this.startSession(event);
    } else {
      // A normal play event happened, just update the playback state
      this.onPlaybackStateChanged(event);
    }
  };

  private onPlaybackFinished = (event: any) => {
    this.debugLog('playbackfinished', event);
    this.onPlaybackStateChanged(event);
    this.endSession(event);

    // Set the flag so we can check from now on if playback of the actual source has finished,
    // independent of ad playback
    this.isPlaybackFinished = true;
  };

  private onSeek = (event: any) => {
    this.playerStateManager.setPlayerSeekStart(event.seekTarget * 1000);
  };

  private onSeeked = () => {
    this.playerStateManager.setPlayerSeekEnd();
  };

  private onVideoQualityChanged = (event: any) => {
    this.playerStateManager.setBitrateKbps(event.targetQuality.bitrate);
  };

  private onCustomEvent = (event: any) => {
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
    playerEvents.add(player.EVENT.ON_READY, this.onPlaybackStateChanged);
    playerEvents.add(player.EVENT.ON_PLAY, this.onPlay);
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
    if (this.sessionKey === Conviva.Client.NO_SESSION_KEY) {
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