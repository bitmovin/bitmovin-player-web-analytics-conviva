import * as Conviva from '@convivainc/conviva-js-coresdk';
import type {
  AdBreakEvent,
  AdEvent,
  AudioTrack,
  ErrorEvent,
  PlaybackEvent,
  PlayerAPI,
  PlayerEvent,
  PlayerEventBase,
  SourceConfig,
  VideoQualityChangedEvent,
  SubtitleTrack,
  TimeMode,
} from 'bitmovin-player';
import { Html5Http } from './Html5Http';
import { Html5Logging } from './Html5Logging';
import { Html5Storage } from './Html5Storage';
import { Html5Time } from './Html5Time';
import { Html5Timer } from './Html5Timer';
import { Timeout } from 'bitmovin-player-ui/dist/js/framework/timeout';
import { ContentMetadataBuilder, Metadata } from './ContentMetadataBuilder';
import { AdHelper } from './helper/AdHelper';
import { PlayerEventWrapper } from './helper/PlayerEventWrapper';
import { PlayerConfigHelper } from './helper/PlayerConfigHelper';

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
   * Option to set the Conviva Device Category, which is used to assist with
   * user agent string parsing by the Conviva SDK. (default: WEB)
   * @deprecated Use `deviceMetadata.category` field
   */
  deviceCategory?: Conviva.valueof<Conviva.ConvivaConstants['DeviceCategory']>;

  /**
   * Option to override the Conviva Device Metadata.
   * (Default: Auto extract all options from User Agent string)
   */
  deviceMetadata?: {
    /**
     * Option to set the Conviva Device Category, which is used to assist with
     * user agent string parsing by the Conviva SDK.
     * (default: The same specified in config.deviceCategory)
     */
    category?: Conviva.valueof<Conviva.ConvivaConstants['DeviceCategory']>;

    /**
     * Option to override the Conviva Device Brand.
     * (Default: Auto extract from User Agent string)
     */
    brand?: string;

    /**
     * Option to override the Conviva Device Manufacturer.
     * (Default: Auto extract from User Agent string)
     */
    manufacturer?: string;

    /**
     * Option to override the Conviva Device Model.
     * (Default: Auto extract from User Agent string)
     */
    model?: string;

    /**
     * Option to override the Conviva Device Type
     * (Default: Auto extract from User Agent string)
     */
    type?: Conviva.valueof<Conviva.ConvivaConstants['DeviceType']>;

    /**
     * Option to override the Conviva Device Version.
     * (Default: Auto extract from User Agent string)
     */
    version?: string;

    /**
     * Option to override the Conviva Operating System Name
     * (Default: Auto extract from User Agent string)
     */
    osName?: string;

    /**
     * Option to override the Conviva Operating System Version
     * (Default: Auto extract from User Agent string)
     */
    osVersion?: string;
  };
}

export interface EventAttributes {
  [key: string]: string;
}

export class ConvivaAnalyticsTracker {
  private static readonly VERSION: string = '{{VERSION}}';

  private static readonly STALL_TRACKING_DELAY_MS = 100;
  private readonly player: PlayerAPI;
  private readonly events: typeof PlayerEvent;
  private readonly handlers: PlayerEventWrapper;
  private readonly config: ConvivaAnalyticsConfiguration;
  private readonly contentMetadataBuilder: ContentMetadataBuilder;

  private readonly logger: Conviva.LoggingInterface;
  private sessionKey: number;
  private convivaVideoAnalytics: Conviva.VideoAnalytics;
  private convivaAdAnalytics: Conviva.AdAnalytics;

  /**
   * Tracks the ad break status and is true between ON_AD_STARTED and ON_AD_FINISHED/SKIPPED/ERROR.
   * This flag is required because player.isAd() is unreliable and not always true between the events.
   */
  private isAdBreak: boolean;

  /**
   * Do not track play event during ad (e.g. triggered from IMA)
   */
  public get canTrackPlayEvent(): boolean {
    return !this.isAdBreak;
  }

  /**
   * Tracks the last ad break event to get the ad position and other ad break related information
   * in the ad started event to report it to Conviva.
   */
  private lastAdBreakEvent: AdBreakEvent;

  // Since there are no stall events during play / playing; seek / seeked; timeShift / timeShifted we need
  // to track stalling state between those events. To prevent tracking eg. when seeking in buffer we delay it.
  private stallTrackingTimeout: Timeout = new Timeout(ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS, () => {
    if (this.isAdBreak) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report buffering ad playback state');
      this.convivaAdAnalytics.reportAdMetric(
        Conviva.Constants.Playback.PLAYER_STATE,
        Conviva.Constants.PlayerState.BUFFERING,
      );
    } else {
    this.debugLog('[ ConvivaAnalyticsTracker ] report buffering playback state');
      this.convivaVideoAnalytics.reportPlaybackMetric(
        Conviva.Constants.Playback.PLAYER_STATE,
        Conviva.Constants.PlayerState.BUFFERING,
      );
    }

  });

  /**
   * Boolean to track whether a session was ended by an upstream caller instead of within internal session management.
   * If this is true, we should avoid initializing a new session internally if a session is not active
   */
  private sessionEndedExternally = false;

  constructor(player: PlayerAPI, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    if (typeof Conviva === 'undefined') {
      console.error(
        `Conviva script missing, cannot init ConvivaAnalytics. Please load the Conviva script (conviva-core-sdk.min.js) before Bitmovin's ConvivaAnalytics integration.`,
      );
      return; // Cancel initialization
    }

    if (player.getSource()) {
      console.error('Bitmovin Conviva integration must be instantiated before calling player.load()');
      return; // Cancel initialization
    }

    this.player = player;

    // TODO: Use alternative to deprecated player.exports
    this.events = player.exports.PlayerEvent;

    this.handlers = new PlayerEventWrapper(player);
    this.config = config;

    // Set default config values
    this.config.debugLoggingEnabled = this.config.debugLoggingEnabled || false;

    this.logger = new Html5Logging();
    this.sessionKey = Conviva.Constants.NO_SESSION_KEY;
    this.isAdBreak = false;

    const deviceMetadataFromConfig = this.config.deviceMetadata || {};
    const deviceMetadata: Conviva.ConvivaDeviceMetadata = {
      [Conviva.Constants.DeviceMetadata.CATEGORY]:
        deviceMetadataFromConfig.category || this.config.deviceCategory || Conviva.Constants.DeviceCategory.WEB,
      [Conviva.Constants.DeviceMetadata.BRAND]: deviceMetadataFromConfig.brand,
      [Conviva.Constants.DeviceMetadata.MANUFACTURER]: deviceMetadataFromConfig.manufacturer,
      [Conviva.Constants.DeviceMetadata.MODEL]: deviceMetadataFromConfig.model,
      [Conviva.Constants.DeviceMetadata.TYPE]: deviceMetadataFromConfig.type,
      [Conviva.Constants.DeviceMetadata.VERSION]: deviceMetadataFromConfig.version,
      [Conviva.Constants.DeviceMetadata.OS_NAME]: deviceMetadataFromConfig.osName,
      [Conviva.Constants.DeviceMetadata.OS_VERSION]: deviceMetadataFromConfig.osVersion,
    };
    Conviva.Analytics.setDeviceMetadata(deviceMetadata);

    let callbackFunctions: Record<string, Function> = {};
    callbackFunctions[Conviva.Constants.CallbackFunctions.CONSOLE_LOG] = this.logger.consoleLog;
    callbackFunctions[Conviva.Constants.CallbackFunctions.MAKE_REQUEST] = new Html5Http().makeRequest;
    const html5Storage = new Html5Storage();
    callbackFunctions[Conviva.Constants.CallbackFunctions.SAVE_DATA] = html5Storage.saveData;
    callbackFunctions[Conviva.Constants.CallbackFunctions.LOAD_DATA] = html5Storage.loadData;
    callbackFunctions[Conviva.Constants.CallbackFunctions.CREATE_TIMER] = new Html5Timer().createTimer;
    callbackFunctions[Conviva.Constants.CallbackFunctions.GET_EPOCH_TIME_IN_MS] = new Html5Time().getEpochTimeMs;

    const settings: Record<string, string | number> = {};
    settings[Conviva.Constants.GATEWAY_URL] = config.gatewayUrl;
    settings[Conviva.Constants.LOG_LEVEL] = this.config.debugLoggingEnabled
      ? Conviva.Constants.LogLevel.DEBUG
      : Conviva.Constants.LogLevel.NONE;

    Conviva.Analytics.init(customerKey, callbackFunctions, settings);

    this.contentMetadataBuilder = new ContentMetadataBuilder(this.logger);

    this.registerPlayerEvents();
  }

  /**
   * Initializes a new conviva tracking session.
   *
   * Warning: The integration can only be validated without external session managing. So when using this method we can
   * no longer ensure that the session is managed at the correct time. Additional: Since some metadata attributes
   * relies on the players source we can't ensure that all metadata attributes are present at session creation.
   * Therefore it could be that there will be a 'ContentMetadata created late' issue after conviva validation.
   *
   * If no source was loaded and no assetName was set via updateContentMetadata this method will throw an error.
   */
  public initializeSession(): void {
    if (this.isSessionActive()) {
      this.logger.consoleLog('[ ConvivaAnalyticsTracker ] There is already a session running.', Conviva.SystemSettings.LogLevel.WARNING);
      return;
    }

    // This could be called before source loaded.
    // Without setting the asset name on the content metadata the SDK will throw errors when we initialize the session.
    if (!this.player.getSource() && !this.contentMetadataBuilder.assetName) {
      throw 'AssetName is missing. Load player source first or set assetName via updateContentMetadata';
    }

    this.internalInitializeSession();
    this.sessionEndedExternally = false;
  }

  /**
   * Ends the current conviva tracking session. If there an ad break is active it will also report the ad as skipped.
   * Results in a no-opt if there is no active session.
   *
   * Warning: Sessions will no longer be created automatically after this method has been called.
   *
   * The integration can only be validated without external session managing. So when using this method we can
   * no longer ensure that the session is managed at the correct time.
   */
  public endSession(): void {
    if (!this.isSessionActive()) {
      return;
    }

    if (this.isAdBreak) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report ad skipped');
      this.convivaAdAnalytics.reportAdSkipped();
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback ended state');
    this.convivaVideoAnalytics.reportPlaybackEnded();

    this.internalEndSession();
    this.resetContentMetadata();
    this.sessionEndedExternally = true;
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    if (!this.isSessionActive()) {
      this.logger.consoleLog(
        '[ ConvivaAnalyticsTracker ] cannot send application event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report custom app event', {
      eventName,
      eventAttributes,
    });
    // NOTE Conviva has event attribute capped and 256 bytes for custom events and will show up as a warning
    // in monitoring session if greater than 256 bytes
    this.convivaVideoAnalytics.reportAppEvent(eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    if (!this.isSessionActive()) {
      this.logger.consoleLog(
        '[ ConvivaAnalyticsTracker ] cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report custom playback event', {
      eventName,
      eventAttributes,
    });
    // NOTE Conviva has event attribute capped and 256 bytes for custom events and will show up as a warning
    // in monitoring session if greater than 256 bytes
    this.convivaVideoAnalytics.reportPlaybackEvent(eventName, eventAttributes);
  }

  /**
   * Will update the contentMetadata which are tracked with conviva.
   *
   * If there is an active session only permitted values will be updated and propagated immediately.
   * If there is no active session the values will set on session creation.
   *
   * Attributes set via this method will override automatic tracked once.
   * @param metadataOverrides Metadata attributes which will be used to track to conviva.
   * @see ContentMetadataBuilder for more information about permitted attributes
   */
  public updateContentMetadata(metadataOverrides: Partial<Metadata>) {
    this.internalUpdateContentMetadata(metadataOverrides);
  }

  /**
   * Sends a custom deficiency event during playback to Conviva's Player Insight. If no session is active it will NOT
   * create one.
   *
   * @param message Message which will be send to conviva
   * @param severity One of FATAL or WARNING
   * @param endSession Boolean flag if session should be closed after reporting the deficiency (Default: true)
   */
  public reportPlaybackDeficiency(
    message: string,
    severity: Conviva.valueof<Conviva.ConvivaConstants['ErrorSeverity']>,
    endSession: boolean = true,
  ) {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback failed', {
      message,
    });
    this.convivaVideoAnalytics.reportPlaybackFailed(message);
    if (endSession) {
      this.internalEndSession();
      this.resetContentMetadata();
    }
  }

  /**
   * Puts the session state in a notMonitored state.
   */
  public pauseTracking(): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] pause tracking via ad break started reporting');
    // AdStart is the right way to pause monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakStarted(
      Conviva.Constants.AdType.CLIENT_SIDE,
      Conviva.Constants.AdPlayer.SEPARATE,
    );
  }

  /**
   * Puts the session state from a notMonitored state into the last one tracked.
   */
  public resumeTracking(): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] resume tracking via ad break ended reporting');
    // AdEnd is the right way to resume monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakEnded();
  }

  public release(event?: PlayerEventBase): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] releasing', event);

    this.unregisterPlayerEvents();
    this.internalEndSession(event);

    Conviva.Analytics.release();
  }

  private debugLog(message?: any, ...optionalParams: any[]): void {
    if (this.config.debugLoggingEnabled) {
      console.log.apply(console, arguments);
    }
  }

  private getUrlFromSource(source: SourceConfig): string {
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

  private internalUpdateContentMetadata(metadataOverrides: Partial<Metadata>) {
    this.contentMetadataBuilder.setOverrides(metadataOverrides);

    if (!this.isSessionActive()) {
      this.logger.consoleLog(
        '[ ConvivaAnalyticsTracker ] no active session. Content metadata will be propagated to Conviva on session initialization.',
        Conviva.SystemSettings.LogLevel.DEBUG,
      );
      return;
    }

    this.buildContentMetadata();
    this.updateSession();
  }

  /**
   * A Conviva Session should only be initialized when there is a source provided in the player because
   * Conviva only allows to update different `contentMetadata` only at different times.
   *
   * The session should be created as soon as there was a play intention from the user.
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
  private internalInitializeSession() {
    this.debugLog('[ ConvivaAnalyticsTracker ] initializing session');

    this.buildContentMetadata();

    // Create a Conviva monitoring session.
    this.convivaVideoAnalytics = Conviva.Analytics.buildVideoAnalytics();
    this.convivaAdAnalytics = Conviva.Analytics.buildAdAnalytics(this.convivaVideoAnalytics);

    const playerInfo = {
      [Conviva.Constants.FRAMEWORK_NAME]: 'Bitmovin Player',
      [Conviva.Constants.FRAMEWORK_VERSION]: this.player.version,
    };

    this.convivaVideoAnalytics.setPlayerInfo(playerInfo);
    this.convivaAdAnalytics.setAdPlayerInfo(playerInfo);

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback requested');
    this.convivaVideoAnalytics.reportPlaybackRequested(this.contentMetadataBuilder.build());

    this.sessionKey = this.convivaVideoAnalytics.getSessionId();

    this.debugLog('[ ConvivaAnalyticsTracker ] new session key', this.sessionKey);

    this.convivaVideoAnalytics.setCallback(() => {
      const playheadTimeMs = this.player.getCurrentTime('relativetime' as TimeMode) * 1000;

      if (this.isAdBreak) {
        this.debugLog('[ ConvivaAnalyticsTracker ] report ad player head time', playheadTimeMs);
        this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAY_HEAD_TIME, playheadTimeMs);
      } else {
        this.debugLog('[ ConvivaAnalyticsTracker ] report player head time', playheadTimeMs);
        this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAY_HEAD_TIME, playheadTimeMs);
      }
    });

    if (!this.isSessionActive()) {
      // Something went wrong. With stable system interfaces, this should never happen.
      this.logger.consoleLog(
        '[ ConvivaAnalyticsTracker ] Something went wrong, could not obtain session key',
        Conviva.SystemSettings.LogLevel.ERROR,
      );
    }

    // Send the session init audio language values.
    this.trackUpdateAudioTrack(this.player.getAudio());

    // Check if at session init has a subtitle enabled.
    this.trackSubtitleWhenInternalInitialize();
  }

  /**
   * Update contentMetadata which must be present before first video frame
   */
  private buildContentMetadata() {
    this.contentMetadataBuilder.duration = this.player.getDuration();
    this.contentMetadataBuilder.streamType = this.player.isLive()
      ? Conviva.ContentMetadata.StreamType.LIVE
      : Conviva.ContentMetadata.StreamType.VOD;

    this.contentMetadataBuilder.addToCustom({
      // Autoplay and preload are important options for the Video Startup Time so we track it as custom tags
      autoplay: PlayerConfigHelper.getAutoplayConfig(this.player) + '',
      preload: PlayerConfigHelper.getPreloadConfig(this.player) + '',
      integrationVersion: ConvivaAnalyticsTracker.VERSION,
    });

    const source = this.player.getSource();

    // This could be called before we got a source
    if (source) {
      this.buildSourceRelatedMetadata(source);
    }
  }

  private buildSourceRelatedMetadata(source: SourceConfig) {
    this.contentMetadataBuilder.assetName = this.getAssetNameFromSource(source);
    this.contentMetadataBuilder.viewerId = this.contentMetadataBuilder.viewerId;
    this.contentMetadataBuilder.addToCustom({
      playerType: this.player.getPlayerType(),
      streamType: this.player.getStreamType(),
      vrContentType: source.vr && source.vr.contentType,
    });

    this.contentMetadataBuilder.streamUrl = this.getUrlFromSource(source);
  }

  private updateSession() {
    if (!this.isSessionActive()) {
      return;
    }

    this.convivaVideoAnalytics.setContentInfo(this.contentMetadataBuilder.build());
  }

  private getAssetNameFromSource(source: SourceConfig): string {
    let assetName;

    const assetTitle = source.title;
    if (assetTitle) {
      assetName = assetTitle;
    } else {
      assetName = 'Untitled (no source.title set)';
    }

    return assetName;
  }

  private internalEndSession = (event?: PlayerEventBase) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] end session', Conviva.Constants.NO_SESSION_KEY, event);

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;

    this.lastAdBreakEvent = null;

    this.isAdBreak = false;
  };

  private resetContentMetadata(): void {
    this.contentMetadataBuilder.reset();
  }

  private isSessionActive(): boolean {
    return !!this.convivaVideoAnalytics;
  }

  private onSourceLoaded = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] source loaded', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.buildSourceRelatedMetadata(this.player.getSource());
    this.updateSession();
  };

  public trackPlaybackStateChanged(event: PlayerEventBase) {
    if (!this.isSessionActive()) {
      return;
    }

    let playerState;

    switch (event.type) {
      case this.events.StallStarted:
        playerState = Conviva.Constants.PlayerState.BUFFERING;
        break;
      case this.events.Playing:
        playerState = Conviva.Constants.PlayerState.PLAYING;
        break;
      case this.events.Paused:
        playerState = Conviva.Constants.PlayerState.PAUSED;
        break;
      case this.events.Seeked:
      case this.events.TimeShifted:
      case this.events.StallEnded:
        if (this.player.isPlaying()) {
          playerState = Conviva.Constants.PlayerState.PLAYING;
        } else {
          playerState = Conviva.Constants.PlayerState.PAUSED;
        }
        break;
    }

    const stallTrackingStartEvents = [
      this.events.Play,
      this.events.Seek,
      this.events.TimeShift,
    ];
    const stallTrackingClearEvents = [
      this.events.StallStarted,
      this.events.Playing,
      this.events.Paused,
      this.events.Seeked,
      this.events.TimeShifted,
      this.events.StallEnded,
      this.events.PlaybackFinished,
    ];

    if (stallTrackingStartEvents.indexOf(event.type) !== -1) {
      this.stallTrackingTimeout.start();
    } else if (stallTrackingClearEvents.indexOf(event.type) !== -1) {
      this.stallTrackingTimeout.clear();
    }


    if (playerState) {
      if (this.isAdBreak) {
        this.debugLog('[ ConvivaAnalyticsTracker ] report ad playback state', playerState);
        this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
      } else {
        this.debugLog('[ ConvivaAnalyticsTracker ] report playback state', playerState);
        this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
      }
    }

    if (event.type === this.events.PlaybackFinished) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report playback ended');
      this.convivaVideoAnalytics.reportPlaybackEnded();
    }
  }

  private onPlay = (event: PlaybackEvent) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] play');

    if (!this.canTrackPlayEvent) {
      return;
    }

    // In case the playback has finished and the user replays the stream create a new session
    if (!this.isSessionActive() && !this.sessionEndedExternally) {
      this.internalInitializeSession();
    }
  };

  private onPlaying = (event: PlaybackEvent) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] playing', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.contentMetadataBuilder.setPlaybackStarted(true);
    this.updateSession();
  };

  private onPlaybackFinished = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] playback finished', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;
  };

  public trackVideoQualityChanged = (event: VideoQualityChangedEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    // We calculate the bitrate with a divisor of 1000 so the values look nicer
    // Example: 250000 / 1000 => 250 kbps (250000 / 1024 => 244kbps)
    const bitrateKbps = Math.round(event.targetQuality.bitrate / 1000);

    this.debugLog('[ ConvivaAnalyticsTracker ] report bitrate', {
      event,
      bitrateKbps,
    });
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.BITRATE, bitrateKbps);
  };

  private onAdBreakStarted = (event: AdBreakEvent) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] adbreak started', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.isAdBreak = true;
    this.lastAdBreakEvent = event;
  }

  public trackAdBreakStarted = (event: AdBreakEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad break started', event);
    this.convivaVideoAnalytics.reportAdBreakStarted(
      Conviva.Constants.AdType.CLIENT_SIDE,
      Conviva.Constants.AdPlayer.SEPARATE,
    );
  };

  public trackAdStarted = (event: AdEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    const adInfo = AdHelper.extractConvivaAdInfo(this.player, this.lastAdBreakEvent, event);
    const bitrateKbps = event.ad.data?.bitrate;

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad started', {
      event,
      adInfo,
    });
    this.convivaAdAnalytics.reportAdStarted(adInfo);

    this.debugLog('[ ConvivaAnalyticsTracker ] report playing ad playback state');
    this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAYER_STATE, Conviva.Constants.PlayerState.PLAYING);

    if (bitrateKbps) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report ad bitrate', bitrateKbps);
      this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.BITRATE, bitrateKbps);
    }
  }

  public trackAdFinished = (event: AdEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad ended', {
      event,
    });
    this.convivaAdAnalytics.reportAdEnded();
  }

  public trackAdSkipped = (event: AdEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad skipped', event);
    this.convivaAdAnalytics.reportAdSkipped();
  };

  private onAdBreakFinished = (event: AdBreakEvent) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] adbreak finished', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.isAdBreak = false;
  }

  public trackAdBreakFinished = (event: AdBreakEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad break ended', event);
    this.convivaVideoAnalytics.reportAdBreakEnded();

    this.debugLog('[ ConvivaAnalyticsTracker ] report playing playback state');
    this.convivaVideoAnalytics.reportPlaybackMetric(
      Conviva.Constants.Playback.PLAYER_STATE,
      Conviva.Constants.PlayerState.PLAYING,
    );
  };

  public trackAdError = (event: ErrorEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    const formattedError = AdHelper.formatAdErrorEvent(event);

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad error', {
      event,
      formattedError,
    });
    this.convivaAdAnalytics.reportAdError(formattedError, Conviva.Constants.ErrorSeverity.WARNING);
  };

  public trackSeekStart(target: number) {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report seek started');
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SEEK_STARTED, target);
  }

  public trackSeekEnd() {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report seek ended');
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SEEK_ENDED);
  }

  public trackUpdateAudioTrack(audioTrack: AudioTrack) {
    if (!this.isSessionActive()) {
      return;
    }

    const formattedAudio =
      audioTrack.lang !== 'unknown' ? '[' + audioTrack.lang + ']:' + audioTrack.label : audioTrack.label;

    this.debugLog('[ ConvivaAnalyticsTracker ] report audio language', {
      formattedAudio,
    });
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.AUDIO_LANGUAGE, formattedAudio);
  }

  public trackUpdateSubtitleTrack(subtitleTrack: SubtitleTrack) {
    if (!this.isSessionActive()) {
      return;
    }

    const formattedSubtitle =
      subtitleTrack.lang !== 'unknown' ? '[' + subtitleTrack.lang + ']:' + subtitleTrack.label : subtitleTrack.label;

    if (subtitleTrack.kind === 'subtitles') {
      this.debugLog('[ ConvivaAnalyticsTracker ] report subtitles language', {
        formattedSubtitle,
      });
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, formattedSubtitle);

      this.debugLog('[ ConvivaAnalyticsTracker ] report off closed captions language');
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE, 'off');
    } else if (subtitleTrack.kind === 'captions') {
      this.debugLog('[ ConvivaAnalyticsTracker ] report closed captions language', {
        formattedSubtitle,
      });
      this.convivaVideoAnalytics.reportPlaybackMetric(
        Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE,
        formattedSubtitle,
      );

      this.debugLog('[ ConvivaAnalyticsTracker ] report off subtitles language');
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, 'off');
    } else {
      this.trackTurnOffSubtitles();
    }
  }

  private trackSubtitleWhenInternalInitialize() {
    if (!this.isSessionActive()) {
      return;
    }

    if (this.player.subtitles !== undefined) {
      const enableSubtitle = this.player.subtitles.list().filter((i) => i.enabled);

      // Send the session init subtitle language values.
      if (enableSubtitle.length === 1) {
        this.trackUpdateSubtitleTrack(enableSubtitle[0]);
        return;
      }
    }

    this.trackTurnOffSubtitles();
  }

  public trackTurnOffSubtitles() {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report off subtitles language');
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, 'off');

    this.debugLog('[ ConvivaAnalyticsTracker ] report off closed captions language');
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE, 'off');
  }

  public trackError = (event: ErrorEvent) => {
    if (!this.isSessionActive() && !this.sessionEndedExternally) {
      // initialize Session if not yet initialized to capture Video Start Failures
      this.internalInitializeSession();
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback deficiency', event);
    this.reportPlaybackDeficiency(String(event.code) + ' ' + event.name, Conviva.Constants.ErrorSeverity.FATAL);
  };

  private onSourceUnloaded = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] source unloaded', event);

    if (this.isAdBreak) {
      // Ignore sourceUnloaded events during ads
      return;
    } else {
      this.internalEndSession(event);
      this.resetContentMetadata();
    }
  };

  private onDestroy = (event: any) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] [ Player Event ] destroy', event);

    this.release(event);
  };

  private registerPlayerEvents(): void {
    this.handlers.add(this.events.SourceLoaded, this.onSourceLoaded);
    this.handlers.add(this.events.Play, this.onPlay);
    this.handlers.add(this.events.Playing, this.onPlaying);
    this.handlers.add(this.events.PlaybackFinished, this.onPlaybackFinished);
    this.handlers.add(this.events.SourceUnloaded, this.onSourceUnloaded);
    this.handlers.add(this.events.Destroy, this.onDestroy);
    this.handlers.add(this.events.AdBreakStarted, this.onAdBreakStarted);
    this.handlers.add(this.events.AdBreakFinished, this.onAdBreakFinished);
  }

  private unregisterPlayerEvents(): void {
    this.handlers.clear();
  }

  static get version(): string {
    return ConvivaAnalyticsTracker.VERSION;
  }
}
