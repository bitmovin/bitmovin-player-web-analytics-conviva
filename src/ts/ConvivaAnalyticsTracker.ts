import * as Conviva from '@convivainc/conviva-js-coresdk';
import {
  AudioTrack,
  ErrorEvent,
  PlaybackEvent,
  PlayerAPI,
  PlayerEventBase,
  SourceConfig,
  VideoQualityChangedEvent,
  SubtitleTrack,
  TimeMode,
  PlayerEvent,
} from 'bitmovin-player';
import { Html5Http } from './Html5Http';
import { Html5Logging } from './Html5Logging';
import { Html5Storage } from './Html5Storage';
import { Html5Time } from './Html5Time';
import { Html5Timer } from './Html5Timer';
import { Timeout } from 'bitmovin-player-ui/dist/js/framework/timeout';
import { ContentMetadataBuilder, CustomMetadata, Metadata, RequiredMetadata } from './ContentMetadataBuilder';
import { AdHelper } from './helper/AdHelper';
import { PlayerEventWrapper } from './helper/PlayerEventWrapper';
import { PlayerConfigHelper } from './helper/PlayerConfigHelper';
import { PlayerStateHelper } from './helper/PlayerStateHelper';

export const AUTOPLAY_CONTENT_METADATA_CUSTOM_TAG = 'autoplay';
export const PRELOAD_CONTENT_METADATA_CUSTOM_TAG = 'preload';
export const INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG = 'integrationVersion';

export const PLAYER_TYPE_CONTENT_METADATA_CUSTOM_TAG = 'playerType';
export const STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG = 'streamType';
export const VR_CONTENT_TYPE_CONTENT_METADATA_CUSTOM_TAG = 'vrContentType';

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

  public static readonly STALL_TRACKING_DELAY_MS = 100;
  private _player: PlayerAPI;

  private get player(): PlayerAPI {
    if (!this._player) {
      throw new Error(
        'Player is not initialized, either pass it to the constructor or attach it via `attachPlayer` before using the integration.',
      );
    }
    return this._player;
  }

  private get isPlayerAttached(): boolean {
    return !!this._player;
  }

  private handlers?: PlayerEventWrapper;
  private readonly config: ConvivaAnalyticsConfiguration;
  private readonly contentMetadataBuilder: ContentMetadataBuilder;

  private readonly logger: Conviva.LoggingInterface = new Html5Logging();
  private sessionKey: number = Conviva.Constants.NO_SESSION_KEY;
  private convivaVideoAnalytics?: Conviva.VideoAnalytics;
  private convivaAdAnalytics?: Conviva.AdAnalytics;

  /**
   * Tracks the ad break status and is true between ON_AD_STARTED and ON_AD_FINISHED/SKIPPED/ERROR.
   * This flag is required because player.isAd() is unreliable and not always true between the events.
   */
  private _isAdBreakActive: boolean = false;

  public get isAdBreakActive(): boolean {
    return this._isAdBreakActive;
  }

  private hasPlayed = false;

  /**
   * Do not track play event during ad (e.g. triggered from IMA)
   */
  public get canTrackPlayEvent(): boolean {
    return !this._isAdBreakActive;
  }

  public canAttachPlayer(player: PlayerAPI) {
    let reason: string | undefined = undefined;

    if (this.isPlayerAttached) {
      reason = 'Player is already attached';
    }

    if (player.getSource()) {
      reason = 'Player.load() has already been called (attaching player is possible only before player.load())';
    }

    return {
      canAttach: !reason,
      reason,
    };
  }

  public attachPlayer(player: PlayerAPI): void {
    const { canAttach } = this.canAttachPlayer(player);

    if (!canAttach) {
      return;
    }

    this._player = player;
    this.handlers = new PlayerEventWrapper(player);
    this.setPlayerInfo();
    this.registerPlayerEvents();
  }

  private setPlayerInfo() {
    if (!this.convivaVideoAnalytics || !this.convivaAdAnalytics || !this.isPlayerAttached) {
      return;
    }

    const playerInfo = {
      [Conviva.Constants.FRAMEWORK_NAME]: 'Bitmovin Player',
      [Conviva.Constants.FRAMEWORK_VERSION]: this.player.version,
    };

    this.convivaVideoAnalytics.setPlayerInfo(playerInfo);
    this.convivaAdAnalytics.setAdPlayerInfo(playerInfo);
  }

  public getContentMetadata() {
    return this.contentMetadataBuilder.build();
  }

  // Since there are no stall events during play / playing; seek / seeked; timeShift / timeShifted we need
  // to track stalling state between those events. To prevent tracking eg. when seeking in buffer we delay it.
  private stallTrackingTimeout: Timeout = new Timeout(ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS, () => {
    this.trackPlaybackState(Conviva.Constants.PlayerState.BUFFERING);
  });

  public startStallTrackingTimeout(event: PlayerEventBase) {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog(`[ ConvivaAnalyticsTracker ] start stall tracking after ${event.type} event`);

    this.stallTrackingTimeout.start();
  }

  public clearStallTrackingTimeout(event: PlayerEventBase) {
    if (!this.stallTrackingTimeout.isActive()) {
      return;
    }

    this.debugLog(`[ ConvivaAnalyticsTracker ] stop stall tracking after ${event.type} event`);

    this.stallTrackingTimeout.clear();
  }

  /**
   * Boolean to track whether a session was ended by an upstream caller instead of within internal session management.
   * If this is true, we should avoid initializing a new session internally if a session is not active
   */
  private sessionEndedExternally = false;

  constructor(customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    if (typeof Conviva === 'undefined') {
      console.error(
        `Conviva script missing, cannot init ConvivaAnalytics. Please load the Conviva script (conviva-core-sdk.min.js) before Bitmovin's ConvivaAnalytics integration.`,
      );
      return; // Cancel initialization
    }

    this.config = config;

    // Set default config values
    this.config.debugLoggingEnabled = this.config.debugLoggingEnabled || false;

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
  }

  public initializeSession(): void {
    if (this.isSessionActive()) {
      this.logger.consoleLog(
        '[ ConvivaAnalyticsTracker ] There is already a session running.',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

    // This could be called before source loaded.
    // Without setting the asset name on the content metadata there will be errors on touchstone when we initialize the session.
    if (!this.isPlayerAttached && !this.contentMetadataBuilder.assetName) {
      throw 'Player is not attached during session initialization and `assetName` is empty in the content metadata. Either attach the player before calling `initializeSession` or set the `assetName` manually using `updateContentMetadata`.';
    } else if (this.isPlayerAttached && !this.player.getSource() && !this.contentMetadataBuilder.assetName) {
      throw 'Player is attached but no source is loaded and `assetName` is empty in the content metadata. Either load a source before calling `initializeSession` or set the `assetName` manually using `updateContentMetadata`.';
    }

    this.internalInitializeSession();
    this.sessionEndedExternally = false;
  }

  private ensurePlaybackFinished() {
    if (!this.isSessionActive()) {
      return;
    }

    if (this._isAdBreakActive) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report ad skipped');
      this.convivaAdAnalytics.reportAdSkipped();
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback ended state');
    this.convivaVideoAnalytics.reportPlaybackEnded();
  }

  public endSession(): void {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalytics ] external ending session');

    this.ensurePlaybackFinished();
    this.internalEndSession();
    this.sessionEndedExternally = true;
  }

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

  public updateContentMetadata(metadataOverrides: Partial<Metadata>) {
    this.internalUpdateContentMetadata(metadataOverrides);
  }

  public updateRequiredContentMetadata(metadataOverrides: Partial<RequiredMetadata>) {
    this.internalUpdateContentMetadata(metadataOverrides);
  }

  public updateCustomContentMetadata(metadataOverrides: Partial<CustomMetadata>) {
    this.internalUpdateCustomContentMetadata(metadataOverrides);
  }

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
    }
  }

  public pauseTracking(): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] pause tracking via ad break started reporting');
    // AdStart is the right way to pause monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakStarted(
      Conviva.Constants.AdType.CLIENT_SIDE,
      Conviva.Constants.AdPlayer.SEPARATE,
    );
  }

  public resumeTracking(): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] resume tracking via ad break ended reporting');
    // AdEnd is the right way to resume monitoring according to conviva.
    this.convivaVideoAnalytics.reportAdBreakEnded();
  }

  public release(isPlayerDestroyed: boolean): void {
    this.debugLog('[ ConvivaAnalyticsTracker ] releasing', {
      isPlayerDestroyed,
    });

    if (!isPlayerDestroyed) {
      this.unregisterPlayerEvents();
    }

    this._player = null;
    this.handlers = null;

    this.ensurePlaybackFinished();
    this.internalEndSession();

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

  /**
   * Applies a content metadata builder update; if a session is active, rebuilds metadata and updates the session.
   * If no session is active, logs and defers propagation to session initialization.
   */
  private applyContentMetadataUpdate(updateBuilder: () => void): void {
    updateBuilder();
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

  private internalUpdateContentMetadata(metadataOverrides: Partial<Metadata>) {
    this.applyContentMetadataUpdate(() => this.contentMetadataBuilder.setOverrides(metadataOverrides));
  }

  private internalUpdateCustomContentMetadata(metadataOverrides: Partial<CustomMetadata>) {
    this.applyContentMetadataUpdate(() => this.contentMetadataBuilder.setCustomOverrides(metadataOverrides));
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

    this.debugLog('[ ConvivaAnalyticsTracker ] report playback requested');
    this.convivaVideoAnalytics.reportPlaybackRequested(this.contentMetadataBuilder.build());

    this.sessionKey = this.convivaVideoAnalytics.getSessionId();

    this.debugLog('[ ConvivaAnalyticsTracker ] new session key', this.sessionKey);

    this.setPlayerInfo();
    // It's required to correctly track VST. There must be BUFFERING or STOPPED metric reported before PLAYING.
    // In some cases BUFFERING does not fire before PLAYING, so we report STOPPED right after session initialization to cover all edge cases.
    this.convivaVideoAnalytics.reportPlaybackMetric(
      Conviva.Constants.Playback.PLAYER_STATE,
      Conviva.Constants.PlayerState.STOPPED,
    );

    this.convivaVideoAnalytics.setCallback(() => {
      if (!this.isPlayerAttached) {
        return;
      }

      const playheadTime = this.player.getCurrentTime(TimeMode.RelativeTime);

      if (!Number.isFinite(playheadTime)) {
        return;
      }

      const playheadTimeMs = playheadTime * 1000;

      if (this._isAdBreakActive) {
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
  }

  /**
   * Update contentMetadata which must be present before first video frame
   */
  private buildContentMetadata() {
    if (!this.isPlayerAttached) {
      this.debugLog(
        '[ ConvivaAnalyticsTracker ] Player is not attached, skipping default content metadata initialization, it will be initialized on source loaded event',
      );
      return;
    }

    this.contentMetadataBuilder.duration = this.player.getDuration();
    this.contentMetadataBuilder.streamType = this.getStreamType();

    this.contentMetadataBuilder.addToCustom({
      // Autoplay and preload are important options for the Video Startup Time so we track it as custom tags
      [AUTOPLAY_CONTENT_METADATA_CUSTOM_TAG]: PlayerConfigHelper.getAutoplayConfig(this.player) + '',
      [PRELOAD_CONTENT_METADATA_CUSTOM_TAG]: PlayerConfigHelper.getPreloadConfig(this.player) + '',
      [INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG]: ConvivaAnalyticsTracker.VERSION,
    });

    const source = this.player.getSource();

    // This could be called before we got a source
    if (source) {
      this.contentMetadataBuilder.assetName = this.getAssetNameFromSource(source);
      this.contentMetadataBuilder.addToCustom({
        [PLAYER_TYPE_CONTENT_METADATA_CUSTOM_TAG]: this.player.getPlayerType(),
        [STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG]: this.getStreamType(),
        [VR_CONTENT_TYPE_CONTENT_METADATA_CUSTOM_TAG]: source.vr && source.vr.contentType,
      });

      this.contentMetadataBuilder.streamUrl = this.getUrlFromSource(source);
    }
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

  private getStreamType(): Conviva.valueof<Conviva.ConvivaConstants['StreamType']> {
    const overrides = this.contentMetadataBuilder.getOverrides();
    if (overrides.streamType !== undefined) {
      return overrides.streamType;
    }
    return this.player.isLive() ? Conviva.ContentMetadata.StreamType.LIVE : Conviva.ContentMetadata.StreamType.VOD;
  }

  private internalEndSession = () => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] end session', this.sessionKey);

    this.contentMetadataBuilder.reset();

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;

    this.hasPlayed = false;
    this._isAdBreakActive = false;
  };

  private isSessionActive(): boolean {
    return !!this.convivaVideoAnalytics;
  }

  private onSourceLoaded = (event: PlayerEventBase) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] building content metadata after source loaded event', event);

    this.buildContentMetadata();
    this.updateSession();
  };

  public trackPlaybackStateFromEvent(event: PlayerEventBase) {
    const playerState = PlayerStateHelper.getPlayerStateFromEvent(event, this.player);

    this.debugLog(`[ ConvivaAnalyticsTracker ] inferred player state ${playerState} from ${event.type} event`, {
      playerState,
      event,
    });

    if (playerState) {
      this.trackPlaybackState(playerState);
    }
  }

  private trackPlaybackState(playerState: Conviva.valueof<Conviva.ConvivaConstants['PlayerState']>) {
    if (!this.isSessionActive()) {
      return;
    }

    if (this._isAdBreakActive) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report ad playback state', playerState);
      this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
    } else {
      this.debugLog('[ ConvivaAnalyticsTracker ] report playback state', playerState);
      this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
    }
  }

  private onPlay = (event: PlaybackEvent) => {
    this.debugLog('[ ConvivaAnalyticsTracker ] checking if session needs to be initialized after play event');

    if (!this.canTrackPlayEvent) {
      return;
    }

    // In case the playback has finished and the user replays the stream create a new session
    if (!this.isSessionActive() && !this.sessionEndedExternally) {
      this.internalInitializeSession();
    }

    if (!this.hasPlayed) {
      this.hasPlayed = true;
      // Send the session init audio language values.
      this.trackUpdateAudioTrack(this.player.getAudio());
      // Check if at session init has a subtitle enabled.
      this.trackInitialSubtitles();
    }
  };

  private onPlaying = (event: PlaybackEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] updating session metadata after playing event', event);

    this.contentMetadataBuilder.setPlaybackStarted(true);
    this.updateSession();
  };

  private onPlaybackFinished = (event: PlayerEventBase) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] releasing everything after playback finished event', event);

    this.trackPlaybackFinished();

    this.convivaVideoAnalytics.release();
    this.convivaVideoAnalytics = null;

    this.convivaAdAnalytics.release();
    this.convivaAdAnalytics = null;
  };

  private trackPlaybackFinished = () => {
    this.debugLog('[ ConvivaAnalyticsTracker ] report playback ended');
    this.convivaVideoAnalytics.reportPlaybackEnded();
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

  public trackAdBreakStarted = (type: Conviva.valueof<Conviva.ConvivaConstants['AdType']>) => {
    if (!this.isSessionActive() || this._isAdBreakActive) {
      return;
    }

    this._isAdBreakActive = true;

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad break started', { type });
    this.convivaVideoAnalytics.reportAdBreakStarted(
      type,
      type === Conviva.Constants.AdType.CLIENT_SIDE
        ? Conviva.Constants.AdPlayer.SEPARATE
        : Conviva.Constants.AdPlayer.CONTENT,
    );
  };

  public trackAdStarted = (
    adInfo: Conviva.ConvivaMetadata,
    type: Conviva.valueof<Conviva.ConvivaConstants['AdType']>,
    bitrateKbps?: number,
  ) => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad started', {
      adInfo,
      type,
      bitrateKbps,
    });
    this.convivaAdAnalytics.reportAdStarted(adInfo);

    this.debugLog(
      `[ ConvivaAnalyticsTracker ] report ${PlayerStateHelper.getPlayerState(
        this.player,
      )} ad playback state on ad started event`,
    );
    this.convivaAdAnalytics.reportAdMetric(
      Conviva.Constants.Playback.PLAYER_STATE,
      PlayerStateHelper.getPlayerState(this.player),
    );

    if (type === Conviva.Constants.AdType.SERVER_SIDE) {
      const playbackVideoData = this.player.getPlaybackVideoData();
      const resolution = `${playbackVideoData.width}x${playbackVideoData.height}`;

      this.debugLog('[ ConvivaAnalyticsTracker ] report ad resolution', resolution);
      this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.RESOLUTION, resolution);

      if (playbackVideoData.frameRate) {
        this.debugLog('[ ConvivaAnalyticsTracker ] report framerate', playbackVideoData.frameRate);
        this.convivaAdAnalytics.reportAdMetric(
          Conviva.Constants.Playback.RENDERED_FRAMERATE,
          playbackVideoData.frameRate,
        );
      }
    }

    if (bitrateKbps) {
      this.debugLog('[ ConvivaAnalyticsTracker ] report ad bitrate', bitrateKbps);
      this.convivaAdAnalytics.reportAdMetric(Conviva.Constants.Playback.BITRATE, bitrateKbps);
    }
  };

  public trackAdFinished = () => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad ended');
    this.convivaAdAnalytics.reportAdEnded();
  };

  public trackAdSkipped = () => {
    if (!this.isSessionActive()) {
      return;
    }

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad skipped');
    this.convivaAdAnalytics.reportAdSkipped();
  };

  public trackRestoringContent = () => {
    if (!this.isSessionActive() || !this._isAdBreakActive) {
      return;
    }

    this._isAdBreakActive = false;

    this.debugLog('[ ConvivaAnalyticsTracker ] report ad break ended');
    this.convivaVideoAnalytics.reportAdBreakEnded();
  };

  public trackAdBreakFinished = (type: Conviva.valueof<Conviva.ConvivaConstants['AdType']>) => {
    const shouldExpectAnotherCsaiAd = type === Conviva.Constants.AdType.CLIENT_SIDE && this._isAdBreakActive;
    if (!this.isSessionActive() || shouldExpectAnotherCsaiAd) {
      // We only care to update the playback state when we are restoring main content.
      return;
    }

    this.trackRestoringContent();

    const playerState = PlayerStateHelper.getPlayerState(this.player);

    this.debugLog(`[ ConvivaAnalyticsTracker ] report ${playerState} playback state on ad break finished event`);
    this.convivaVideoAnalytics.reportPlaybackMetric(Conviva.Constants.Playback.PLAYER_STATE, playerState);
  };

  public trackAdError = (event: ErrorEvent) => {
    if (!this.isSessionActive()) {
      return;
    }

    const formattedError = AdHelper.formatCsaiAdError(event);

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

  private trackInitialSubtitles() {
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
    this.debugLog('[ ConvivaAnalyticsTracker ] checking if seession needs to be ended after source unloaded', event);

    if (this._isAdBreakActive) {
      // Ignore sourceUnloaded events during ads
      return;
    } else {
      this.internalEndSession();
    }
  };

  // These are attached earlier than the ones inside `ConvivaAnalytics`
  private registerPlayerEvents(): void {
    this.handlers.add(PlayerEvent.SourceLoaded, this.onSourceLoaded);
    this.handlers.add(PlayerEvent.Play, this.onPlay);
    this.handlers.add(PlayerEvent.Playing, this.onPlaying);
    this.handlers.add(PlayerEvent.PlaybackFinished, this.onPlaybackFinished);
    this.handlers.add(PlayerEvent.SourceUnloaded, this.onSourceUnloaded);
  }

  private unregisterPlayerEvents(): void {
    this.handlers?.clear();
  }

  static get version(): string {
    return ConvivaAnalyticsTracker.VERSION;
  }
}
