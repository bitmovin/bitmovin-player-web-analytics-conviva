import * as Conviva from '@convivainc/conviva-js-coresdk';
import type {
  AdBreakEvent,
  AdEvent,
  AudioChangedEvent,
  AudioTrack,
  ErrorEvent,
  PlaybackEvent,
  PlayerAPI,
  PlayerEvent,
  PlayerEventBase,
  SeekEvent,
  SourceConfig,
  TimeShiftEvent,
  VideoQualityChangedEvent,
  SubtitleEvent,
  SubtitleTrack,
  TimeMode,
  AdData,
  VastAdData,
  Ad,
  LinearAd,
} from 'bitmovin-player';
import { Html5Http } from './Html5Http';
import { Html5Logging } from './Html5Logging';
import { Html5Storage } from './Html5Storage';
import { Html5Time } from './Html5Time';
import { Html5Timer } from './Html5Timer';
import { Timeout } from 'bitmovin-player-ui/dist/js/framework/timeout';
import { ContentMetadataBuilder, Metadata } from './ContentMetadataBuilder';
import { ObjectUtils } from './helper/ObjectUtils';
import { BrowserUtils } from './helper/BrowserUtils';
import { ArrayUtils } from 'bitmovin-player-ui/dist/js/framework/arrayutils';
import { AdBreakHelper } from './helper/AdBreakHelper';

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

export class ConvivaAnalytics {
  private static readonly VERSION: string = '{{VERSION}}';

  private static STALL_TRACKING_DELAY_MS = 100;
  private readonly player: Player;
  private events: typeof PlayerEvent;
  private readonly handlers: PlayerEventWrapper;
  private config: ConvivaAnalyticsConfiguration;
  private readonly contentMetadataBuilder: ContentMetadataBuilder;

  private readonly logger: Conviva.LoggingInterface;
  private sessionKey: number;
  private convivaVideoAnalytics: Conviva.VideoAnalytics;
  private convivaAdAnalytics: Conviva.AdAnalytics;

  /**
   * Tracks the ad playback status and is true between ON_AD_STARTED and ON_AD_FINISHED/SKIPPED/ERROR.
   * This flag is required because player.isAd() is unreliable and not always true between the events.
   */
  private isAdBreak: boolean;

  private lastAdBreakEvent: AdBreakEvent;

  // Since there are no stall events during play / playing; seek / seeked; timeShift / timeShifted we need
  // to track stalling state between those events. To prevent tracking eg. when seeking in buffer we delay it.
  private stallTrackingTimout: Timeout = new Timeout(ConvivaAnalytics.STALL_TRACKING_DELAY_MS, () => {
    this.convivaVideoAnalytics.reportPlaybackMetric(
      Conviva.Constants.Playback.PLAYER_STATE,
      Conviva.Constants.PlayerState.BUFFERING,
    );
  });

  /**
   * Boolean to track whether a session was ended by an upstream caller instead of within internal session management.
   * If this is true, we should avoid initializing a new session internally if a session is not active
   */
  private sessionEndedExternally = false;

  constructor(player: Player, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
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
      this.logger.consoleLog('[ ConvivaAnalytics ] There is already a session running.', Conviva.SystemSettings.LogLevel.WARNING);
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
   * Ends the current conviva tracking session.
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

    this.convivaVideoAnalytics.reportPlaybackEnded();

    if (this.isAdBreak) {
      this.convivaAdAnalytics.reportAdSkipped();
    }

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
        '[ ConvivaAnalytics ] cannot send application event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

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
        '[ ConvivaAnalytics ] cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

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
    // AdStart is the right way to pause monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakStarted(
      Conviva.Constants.AdType.CLIENT_SIDE,
      Conviva.Constants.AdPlayer.SEPARATE,
    );
    // this.convivaVideoAnalytics.reportPlaybackEvent(Conviva.Constants.Events.USER_WAIT_STARTED)
    // this.convivaAdAnalytics.reportAdPlayerEvent(Conviva.Constants.Events.USER_WAIT_STARTED);
    // TODO what to do with ad analytics?
    this.debugLog('[ ConvivaAnalytics ] Tracking paused.');
  }

  /**
   * Puts the session state from a notMonitored state into the last one tracked.
   */
  public resumeTracking(): void {
    // AdEnd is the right way to resume monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakEnded();
    this.convivaVideoAnalytics.reportPlaybackEvent(Conviva.Constants.Events.USER_WAIT_ENDED);
    // TODO what to do with ad analytics?
    this.debugLog('[ ConvivaAnalytics ] Tracking resumed.');
  }

  public release(): void {
    this.destroy();
  }

  private destroy(event?: PlayerEventBase): void {
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
        '[ ConvivaAnalytics ] no active session. Content metadata will be propagated to Conviva on session initialization.',
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

    this.convivaVideoAnalytics.reportPlaybackRequested(this.contentMetadataBuilder.build());
    this.sessionKey = this.convivaVideoAnalytics.getSessionId();
    this.convivaVideoAnalytics.setCallback(() => {
      const playheadTimeMs = this.player.getCurrentTime('relativetime' as TimeMode) * 1000;
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAY_HEAD_TIME, playheadTimeMs);
    });

    this.convivaAdAnalytics.setCallback(() => {
      if (this.isAdBreak) {
        const playheadTimeMs = this.player.getCurrentTime('relativetime' as TimeMode) * 1000;

        this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAY_HEAD_TIME, playheadTimeMs);
      }
    });

    this.debugLog('[ ConvivaAnalytics ] start session', this.sessionKey);

    if (!this.isSessionActive()) {
      // Something went wrong. With stable system interfaces, this should never happen.
      this.logger.consoleLog(
        '[ ConvivaAnalytics ] Something went wrong, could not obtain session key',
        Conviva.SystemSettings.LogLevel.ERROR,
      );
    }

    // Send the session init audio language values.
    this.updateAudioTrack(this.player.getAudio());

    // Check if at session init has a subtitle enabled.
    this.checkSubtitleWhenInternalInitialize();
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
      integrationVersion: ConvivaAnalytics.VERSION,
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

    this.debugLog('[ ConvivaAnalytics ] end session', Conviva.Constants.NO_SESSION_KEY, event);

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;

    this.lastAdBreakEvent = null;
  };

  private resetContentMetadata(): void {
    this.contentMetadataBuilder.reset();
  }

  private isSessionActive(): boolean {
    return !!this.convivaVideoAnalytics;
  }

  private onPlaybackStateChanged = (event: PlayerEventBase) => {
    this.debugLog('[ Player Event ] playback state change related event', event);

    // Do not track playback state changes during ads, (e.g. triggered from IMA)
    // or if there is no active session.
    if (this.isAdBreak || !this.isSessionActive()) {
      return;
    }

    let playerState;

    switch (event.type) {
      case this.events.Play:
      case this.events.Seek:
      case this.events.TimeShift:
        this.stallTrackingTimout.start();
        break;
      case this.events.StallStarted:
        this.stallTrackingTimout.clear();
        playerState = Conviva.Constants.PlayerState.BUFFERING;
        break;
      case this.events.Playing:
        this.stallTrackingTimout.clear();

        playerState = Conviva.Constants.PlayerState.PLAYING;
        break;
      case this.events.Paused:
        this.stallTrackingTimout.clear();
        playerState = Conviva.Constants.PlayerState.PAUSED;
        break;
      case this.events.Seeked:
      case this.events.TimeShifted:
      case this.events.StallEnded:
        this.stallTrackingTimout.clear();
        if (this.player.isPlaying()) {
          playerState = Conviva.Constants.PlayerState.PLAYING;
        } else {
          playerState = Conviva.Constants.PlayerState.PAUSED;
        }
        break;
      case this.events.PlaybackFinished:
        this.stallTrackingTimout.clear();
        this.convivaVideoAnalytics.reportPlaybackEnded();
        break;
    }

    if (playerState) {
      this.debugLog('[ ConvivaAnalytics ] report playback state', playerState);
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);

      if (this.isAdBreak) {
        this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
      }
    }
  };

  private onSourceLoaded = (event: PlayerEventBase) => {
    this.debugLog('[ Player Event ] source loaded', event);

    // In case the session was created external before loading the source
    if (!this.isSessionActive()) {
      return;
    }

    this.buildSourceRelatedMetadata(this.player.getSource());
    this.updateSession();
  };

  private onPlay = (event: PlaybackEvent) => {
    this.debugLog('[ Player Event ] play', event);

    if (this.isAdBreak) {
      // Do not track play event during ad (e.g. triggered from IMA)
      return;
    }

    // in case the playback has finished and the user replays the stream create a new session
    if (!this.isSessionActive() && !this.sessionEndedExternally) {
      this.internalInitializeSession();
    }

    this.onPlaybackStateChanged(event);
  };

  private onPlaying = (event: PlaybackEvent) => {
    this.contentMetadataBuilder.setPlaybackStarted(true);
    this.debugLog('[ Player Event ] playing', event);
    this.updateSession();
    this.onPlaybackStateChanged(event);
  };

  private onPlaybackFinished = (event: PlayerEventBase) => {
    this.debugLog('[ Player Event ] playback finished', event);

    if (!this.isSessionActive()) {
      return;
    }

    this.onPlaybackStateChanged(event);

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;
  };

  private onVideoQualityChanged = (event: VideoQualityChangedEvent) => {
    this.debugLog('[ Player Event ] video quality changed', event);

    // We calculate the bitrate with a divisor of 1000 so the values look nicer
    // Example: 250000 / 1000 => 250 kbps (250000 / 1024 => 244kbps)
    const bitrateKbps = Math.round(event.targetQuality.bitrate / 1000);

    this.debugLog('[ ConvivaAnalytics ] report bitrate', {
      event,
      bitrateKbps,
    });

    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.BITRATE, bitrateKbps);
  };

  private onCustomEvent = (event: PlayerEventBase) => {
    this.debugLog('[ Player Event ] custom playback related event', event);

    if (!this.isSessionActive()) {
      this.debugLog('[ ConvivaAnalytics ] skip custom event, no session existing', event);
      return;
    }

    const eventAttributes = ObjectUtils.flatten(event);
    this.sendCustomPlaybackEvent(event.type, eventAttributes);
  };

  // Fires before `onAdStarted`
  private onAdBreakStarted = (event: AdBreakEvent) => {
    this.debugLog('[ Player Event ] adbreak started', event);

    this.isAdBreak = true;
    this.lastAdBreakEvent = event;

    this.debugLog('[ ConvivaAnalytics ] report ad break started', event);

    this.convivaVideoAnalytics.reportAdBreakStarted(
      Conviva.Constants.AdType.CLIENT_SIDE,
      Conviva.Constants.AdPlayer.SEPARATE,
    );
  };

  private onAdStarted = (event: AdEvent) => {
    this.debugLog('[ Player Event ] ad started', event);

    const adPosition = AdBreakHelper.mapAdPosition(this.lastAdBreakEvent.adBreak, this.player);
    const ad = event.ad as Ad | LinearAd;
    const adData = ad.data as undefined | AdData | VastAdData;

    let adSystemName = 'NA';
    let creativeId = 'NA';
    let adTitle: string | undefined;
    let firstAdId = ad.id;

    // TODO these two are not exposed currently. Add them whenever the player
    // exposes them similar to https://github.com/bitmovin-engineering/player-android/pull/3147.
    // Related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801796326889.
    let firstAdSystem = 'NA';
    let firstCreativeId = 'NA';

    // No way to get it reliably, related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801970037469.
    let mediaFileApiFramework = 'NA';

    if (adData) {
      if ('adSystem' in adData && adData.adSystem?.name) {
        adSystemName = adData.adSystem.name;
      }

      if ('creative' in adData && adData?.creative?.id) {
        creativeId = adData.creative.id;
      }

      if ('adTitle' in adData && adData.adTitle) {
        adTitle = adData.adTitle;
      }

      if ('wrapperAdIds' in adData && adData.wrapperAdIds && adData.wrapperAdIds.length) {
        firstAdId = adData.wrapperAdIds[adData.wrapperAdIds.length - 1];
      }
    }

    const adInfo: Conviva.ConvivaMetadata = {
      'c3.ad.id': ad.id,
      'c3.ad.technology': Conviva.Constants.AdType.CLIENT_SIDE,
      'c3.ad.position': adPosition,
      'c3.ad.system': adSystemName,
      'c3.ad.creativeId': creativeId,
      'c3.ad.firstAdId': firstAdId,
      'c3.ad.mediaFileApiFramework': mediaFileApiFramework,
      'c3.ad.firstAdSystem': firstAdSystem,
      'c3.ad.firstCreativeId': firstCreativeId,

      // These two are not relevant for the client side (keep in the code for documentation purposes)
      // 'c3.ad.adStitcher': undefined,
      // 'c3.ad.isSlate': undefined,
    };

    if (adTitle) {
      adInfo[Conviva.Constants.ASSET_NAME] = adTitle;
    }

    if (event.ad.mediaFileUrl) {
      adInfo[Conviva.Constants.STREAM_URL] = event.ad.mediaFileUrl;
    }

    if ('duration' in ad && ad.duration) {
      adInfo[Conviva.Constants.DURATION] = ad.duration;
    }

    this.debugLog('[ ConvivaAnalytics ] report ad started', {
      event,
      adInfo,
    });

    this.convivaAdAnalytics.reportAdStarted(adInfo);
    this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAYER_STATE, Conviva.Constants.PlayerState.PLAYING);
  }

  // Fires before `onAdBreakFinished`
  private onAdFinished = (event: AdEvent) => {
    this.debugLog('[ Player Event ] ad finished', event);

    this.debugLog('[ ConvivaAnalytics ] report ad ended', {
      event,
    });

    this.convivaAdAnalytics.reportAdEnded();
  }

  // Fires before `onAdBreakFinished`
  private onAdSkipped = (event: AdEvent) => {
    this.debugLog('[ Player Event ] ad skipped', event);

    this.debugLog('[ ConvivaAnalytics ] report ad skipped', event);
    this.convivaAdAnalytics.reportAdSkipped();

    this.onCustomEvent(event);
  };

  private onAdBreakFinished = (event: AdBreakEvent | ErrorEvent) => {
    this.debugLog('[ Player Event ] adbreak finished', event);
    this.isAdBreak = false;

    this.debugLog('[ ConvivaAnalytics ] report ad break ended', {
      event,
    });
    this.convivaVideoAnalytics.reportAdBreakEnded();
    this.convivaVideoAnalytics.reportPlaybackMetric(
      Conviva.Constants.Playback.PLAYER_STATE,
      Conviva.Constants.PlayerState.PLAYING,
    );
  };

  private onAdError = (
    event: ErrorEvent & {
      message?: string,
      troubleShootLink?: string,
      data?: {
        code?: number,
      },
    },
  ) => {
    this.debugLog('[ Player Event ] ad error', event);

    const message = event?.message || 'Unknown message';
    const name = event?.name || 'Unknown name';
    const formattedErrorParts = [
      `${name}:`,
      `${message};`,
      `Error code: ${event.code};`,
      event.data?.code ? `Ad error code: ${event.data?.code};` : undefined,
      event.troubleShootLink ? `Troubleshoot link: ${event.troubleShootLink}` : undefined,
    ].filter(Boolean);
    const formattedError = formattedErrorParts.join(' ');
    this.debugLog('[ ConvivaAnalytics ] report ad error', {
      event,
      formattedError,
    });
    this.convivaAdAnalytics.reportAdError(`Ad error: ${formattedError}`, Conviva.Constants.ErrorSeverity.WARNING);

    this.onCustomEvent(event);
  };

  private onSeek = (event: SeekEvent) => {
    this.debugLog('[ Player Event ] seek', event);

    if (!this.isSessionActive()) {
      // Handle the case that the User seeks on the UI before play was triggered.
      // This also handles startTime feature. The same applies for onTimeShift.
      return;
    }

    this.trackSeekStart(event.seekTarget);
    this.onPlaybackStateChanged(event);
  };

  private onSeeked = (event: SeekEvent) => {
    this.debugLog('[ Player Event ] seeked', event);

    if (!this.isSessionActive()) {
      // See comment in onSeek
      return;
    }

    this.trackSeekEnd();
    this.onPlaybackStateChanged(event);
  };

  private onTimeShift = (event: TimeShiftEvent) => {
    this.debugLog('[ Player Event ] time shift', event);

    if (!this.isSessionActive()) {
      // See comment in onSeek
      return;
    }

    // According to conviva it is valid to pass -1 for seeking in live streams
    this.trackSeekStart(-1);
    this.onPlaybackStateChanged(event);
  };

  private onTimeShifted = (event: TimeShiftEvent) => {
    this.debugLog('[ Player Event ] time shifted', event);

    if (!this.isSessionActive()) {
      // See comment in onSeek
      return;
    }

    this.trackSeekEnd();
    this.onPlaybackStateChanged(event);
  };

  private trackSeekStart(target: number) {
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SEEK_STARTED);
  }

  private trackSeekEnd() {
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SEEK_ENDED);
  }
  private onAudioChanged = (event: AudioChangedEvent) => {
    this.debugLog('[ Player Event ] audio changed', event);

    if (!this.isSessionActive()) {
      // Handle the case that the User change audio on the UI before play was triggered.
      return;
    }

    this.updateAudioTrack(event.targetAudio);
  };

  private updateAudioTrack(audioTrack: AudioTrack) {
    const formattedAudio =
      audioTrack.lang !== 'unknown' ? '[' + audioTrack.lang + ']:' + audioTrack.label : audioTrack.label;
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.AUDIO_LANGUAGE, formattedAudio);
  }

  private onSubtitleEnabled = (event: SubtitleEvent) => {
    this.debugLog('[ Player Event ] subtitled enabled', event);

    if (!this.isSessionActive()) {
      // Handle the case that the User change subtitle on the UI before play was triggered.
      return;
    }
    this.updateSubtitleTrack(event.subtitle);
  };

  private updateSubtitleTrack(subtitleTrack: SubtitleTrack) {
    const formattedSubtitle =
      subtitleTrack.lang !== 'unknown' ? '[' + subtitleTrack.lang + ']:' + subtitleTrack.label : subtitleTrack.label;

    if (subtitleTrack.kind === 'subtitles') {
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, formattedSubtitle);

      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE, 'off');
    } else if (subtitleTrack.kind === 'captions') {
      this.convivaVideoAnalytics.reportPlaybackMetric(
        Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE,
        formattedSubtitle,
      );

      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, 'off');
    } else {
      this.turnOffSubtitles();
    }
  }

  private onSubtitleDisabled = (event: SubtitleEvent) => {
    this.debugLog('[ Player Event ] subtitles disabled', event);

    if (!this.isSessionActive()) {
      // Handle the case that the User turn off subtitle on the UI before play was triggered.
      return;
    }

    this.turnOffSubtitles();
  };

  private checkSubtitleWhenInternalInitialize() {
    if (this.player.subtitles !== undefined) {
      const enableSubtitle = this.player.subtitles.list().filter((i) => i.enabled);

      // Send the session init subtitle language values.
      if (enableSubtitle.length === 1) {
        this.updateSubtitleTrack(enableSubtitle[0]);
        return;
      }
    }

    this.turnOffSubtitles();
  }

  private turnOffSubtitles() {
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.SUBTITLES_LANGUAGE, 'off');

    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE, 'off');
  }

  private onError = (event: ErrorEvent) => {
    this.debugLog('[ Player Event ] error', event);

    if (!this.isSessionActive() && !this.sessionEndedExternally) {
      // initialize Session if not yet initialized to capture Video Start Failures
      this.internalInitializeSession();
    }

    this.reportPlaybackDeficiency(String(event.code) + ' ' + event.name, Conviva.Constants.ErrorSeverity.FATAL);
  };

  private onSourceUnloaded = (event: PlayerEventBase) => {
    this.debugLog('[ Player Event ] source unloaded', event);

    if (this.isAdBreak) {
      // Ignore sourceUnloaded events during ads
      return;
    } else {
      this.internalEndSession(event);
      this.resetContentMetadata();
    }
  };

  private onDestroy = (event: any) => {
    this.debugLog('[ Player Event ] destroy', event);

    this.destroy(event);
  };

  private registerPlayerEvents(): void {
    const playerEvents = this.handlers;

    playerEvents.add(this.events.SourceLoaded, this.onSourceLoaded);
    playerEvents.add(this.events.Play, this.onPlay);
    playerEvents.add(this.events.Playing, this.onPlaying);
    playerEvents.add(this.events.Paused, this.onPlaybackStateChanged);
    playerEvents.add(this.events.StallStarted, this.onPlaybackStateChanged);
    playerEvents.add(this.events.StallEnded, this.onPlaybackStateChanged);
    playerEvents.add(this.events.PlaybackFinished, this.onPlaybackFinished);
    playerEvents.add(this.events.VideoPlaybackQualityChanged, this.onVideoQualityChanged);
    playerEvents.add(this.events.AudioPlaybackQualityChanged, this.onCustomEvent);
    playerEvents.add(this.events.Muted, this.onCustomEvent);
    playerEvents.add(this.events.Unmuted, this.onCustomEvent);
    playerEvents.add(this.events.ViewModeChanged, this.onCustomEvent);
    playerEvents.add(this.events.AdStarted, this.onAdStarted);
    playerEvents.add(this.events.AdFinished, this.onAdFinished);
    playerEvents.add(this.events.AdBreakStarted, this.onAdBreakStarted);
    playerEvents.add(this.events.AdBreakFinished, this.onAdBreakFinished);
    playerEvents.add(this.events.AdSkipped, this.onAdSkipped);
    playerEvents.add(this.events.AdError, this.onAdError);
    playerEvents.add(this.events.SourceUnloaded, this.onSourceUnloaded);
    playerEvents.add(this.events.Error, this.onError);
    playerEvents.add(this.events.Destroy, this.onDestroy);
    playerEvents.add(this.events.Seek, this.onSeek);
    playerEvents.add(this.events.Seeked, this.onSeeked);
    playerEvents.add(this.events.TimeShift, this.onTimeShift);
    playerEvents.add(this.events.TimeShifted, this.onTimeShifted);
    playerEvents.add(this.events.AudioChanged, this.onAudioChanged);
    playerEvents.add(this.events.SubtitleEnabled, this.onSubtitleEnabled);
    playerEvents.add(this.events.SubtitleDisabled, this.onSubtitleDisabled);

    playerEvents.add(this.events.CastStarted, this.onCustomEvent);
    playerEvents.add(this.events.CastStopped, this.onCustomEvent);
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
      if (
        playerConfig.adaptation &&
        playerConfig.adaptation.mobile &&
        playerConfig.adaptation.mobile.preload !== undefined
      ) {
        return playerConfig.adaptation.mobile.preload;
      }
    } else {
      if (
        playerConfig.adaptation &&
        playerConfig.adaptation.desktop &&
        playerConfig.adaptation.desktop.preload !== undefined
      ) {
        return playerConfig.adaptation.desktop.preload;
      }
    }

    if (playerConfig.adaptation && playerConfig.adaptation.preload !== undefined) {
      return playerConfig.adaptation.preload;
    }

    return !player.isLive();
  }
}

class PlayerEventWrapper {
  private player: Player;
  private readonly eventHandlers: { [eventType: string]: Array<(event?: PlayerEventBase) => void> };

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
