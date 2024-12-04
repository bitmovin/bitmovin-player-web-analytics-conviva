import * as Conviva from '@convivainc/conviva-js-coresdk';
import {
  AdBreakEvent,
  AdEvent,
  AudioChangedEvent,
  ErrorEvent,
  PlaybackEvent,
  PlayerAPI,
  PlayerEvent,
  PlayerEventBase,
  SeekEvent,
  TimeShiftEvent,
  VideoQualityChangedEvent,
  SubtitleEvent,
} from 'bitmovin-player';
import { Metadata } from './ContentMetadataBuilder';
import { ObjectUtils } from './helper/ObjectUtils';
import { ConvivaAnalyticsConfiguration, ConvivaAnalyticsTracker, EventAttributes } from './ConvivaAnalyticsTracker';
import { ConvivaAnalyticsSsai } from './ConvivaAnalyticsSsai';
import { PlayerEventWrapper } from './helper/PlayerEventWrapper';
import { AdHelper } from './helper/AdHelper';
import { Html5Logging } from './Html5Logging';

export class ConvivaAnalytics {
  private handlers?: PlayerEventWrapper;
  private readonly convivaAnalyticsTracker: ConvivaAnalyticsTracker;
  private _player?: PlayerAPI;

  private get player(): PlayerAPI {
    if (!this._player) {
      throw new Error(
        'Player is not initialized, either pass it to the constructor or attach it via `attachPlayer` before using the integration.',
      );
    }
    return this._player;
  }

  private readonly debugLoggingEnabled: boolean;

  /**
   * Tracks the last ad break event to get the ad position and other ad break related information
   * in the ad started event to report it to Conviva.
   */
  private lastAdBreakEvent: AdBreakEvent;

  private convivaSsaiAnalytics: ConvivaAnalyticsSsai;

  private readonly logger: Conviva.LoggingInterface = new Html5Logging();

  public readonly ssai: Omit<ConvivaAnalyticsSsai, 'reset'>;

  constructor(player: PlayerAPI | undefined, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    this.convivaAnalyticsTracker = new ConvivaAnalyticsTracker(customerKey, config);
    this.debugLoggingEnabled = config.debugLoggingEnabled || false;
    this._player = player;

    if (player) {
      this.attachPlayer(player);
    }

    this.convivaSsaiAnalytics = new ConvivaAnalyticsSsai(this.convivaAnalyticsTracker);

    // Do not expose `reset` method to the public API.
    this.ssai = {
      get isAdBreakActive() {
        return this.convivaSsaiAnalytics.isAdBreakActive;
      },
      reportAdBreakStarted: this.convivaSsaiAnalytics.reportAdBreakStarted.bind(this.convivaSsaiAnalytics),
      reportAdStarted: this.convivaSsaiAnalytics.reportAdStarted.bind(this.convivaSsaiAnalytics),
      reportAdFinished: this.convivaSsaiAnalytics.reportAdFinished.bind(this.convivaSsaiAnalytics),
      reportAdSkipped: this.convivaSsaiAnalytics.reportAdSkipped.bind(this.convivaSsaiAnalytics),
      reportAdBreakFinished: this.convivaSsaiAnalytics.reportAdBreakFinished.bind(this.convivaSsaiAnalytics),
    };
  }

  /**
   * Attaches the player instance to the integration. This can be used for late player attaching e.g.
   * to measure VST (Video start time) more precisely.
   *
   * Has no effect if there is already a `Player` instance set. Use the `new ConvivaAnalytics(...)` without `player`
   * if you plan to attach a `Player` instance later in the life-cycle.
   *
   * Example:
   * ```
   * const convivaAnalytics = new ConvivaAnalytics(undefined, '<CONVIVA_CUSTOMER_KEY>')
   *
   * // Asset name is required to be set when initializing the session before `player.load()`.
   * convivaAnalytics.updateContentMetadata({ assetName: 'My video' });
   * convivaAnalytics.initializeSession();
   *
   * // ... Additional setup steps
   *
   * convivaAnalytics.attachPlayer(player);
   * player.load({ ... });
   * ```
   *
   * @param player The player instance to attach to the integration.
   */
  public attachPlayer(player: PlayerAPI): void {
    const { canAttach, reason } = this.convivaAnalyticsTracker.canAttachPlayer(player);

    if (!canAttach) {
      this.logger.consoleLog(
        `[ ConvivaAnalyticsTracker ] cannot attach player: ${reason}`,
        Conviva.SystemSettings.LogLevel.WARNING,
      );
      return;
    }

    this.convivaAnalyticsTracker.attachPlayer(player);
    this._player = player;
    this.handlers = new PlayerEventWrapper(player);
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
    this.convivaAnalyticsTracker.initializeSession();
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
    this.debugLog('[ ConvivaAnalytics ] external ending session');
    this.convivaSsaiAnalytics.reset();
    this.convivaAnalyticsTracker.endSession();
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.convivaAnalyticsTracker.sendCustomApplicationEvent(eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  public sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.convivaAnalyticsTracker.sendCustomPlaybackEvent(eventName, eventAttributes);
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
    this.convivaAnalyticsTracker.updateContentMetadata(metadataOverrides);
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
    this.convivaAnalyticsTracker.reportPlaybackDeficiency(message, severity, endSession);
  }

  /**
   * Puts the session state in a notMonitored state.
   */
  public pauseTracking(): void {
    this.convivaAnalyticsTracker.pauseTracking();
  }

  /**
   * Puts the session state from a notMonitored state into the last one tracked.
   */
  public resumeTracking(): void {
    this.convivaAnalyticsTracker.resumeTracking();
  }

  public release(): void {
    this.releaseInternal();
  }

  private releaseInternal(event?: PlayerEventBase): void {
    const isPlayerDestroyed = event?.type === PlayerEvent.Destroy;

    if (!isPlayerDestroyed) {
      this.unregisterPlayerEvents();
    }

    this._player = null;
    this.handlers = null;

    this.debugLog('[ ConvivaAnalytics ] releasing', {
      event,
      isPlayerDestroyed,
    });
    this.convivaAnalyticsTracker.release(isPlayerDestroyed);
    this.convivaSsaiAnalytics.reset();
    this.lastAdBreakEvent = null;
  }

  private debugLog(message?: any, ...optionalParams: any[]): void {
    if (this.debugLoggingEnabled) {
      console.log.apply(console, arguments);
    }
  }

  private onPlaybackStateChanged = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] playback state change related event', event);
    this.convivaAnalyticsTracker.trackPlaybackStateChanged(event);
  };

  private onPlay = (event: PlaybackEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] play', event);

    if (!this.convivaAnalyticsTracker.canTrackPlayEvent) {
      return;
    }

    this.onPlaybackStateChanged(event);
  };

  private onPlaying = (event: PlaybackEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] playing', event);
    this.onPlaybackStateChanged(event);
  };

  private onPlaybackFinished = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] playback finished', event);
    this.onPlaybackStateChanged(event);
  };

  private onVideoQualityChanged = (event: VideoQualityChangedEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] video quality changed', event);
    this.convivaAnalyticsTracker.trackVideoQualityChanged(event);
  };

  private onCustomEvent = (event: PlayerEventBase) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] custom playback related event', event);
    const eventAttributes = ObjectUtils.flatten(event);
    this.sendCustomPlaybackEvent(event.type, eventAttributes);
  };

  private onAdBreakStarted = (event: AdBreakEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] adbreak started', event);
    this.lastAdBreakEvent = event;
    this.convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
    this.convivaAnalyticsTracker.trackPlaybackStateChanged(event);
  };

  private onAdStarted = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad started', event);

    const adInfo = AdHelper.extractCsaiConvivaAdInfo(this.player, this.lastAdBreakEvent, event);
    const bitrateKbps = event.ad.data?.bitrate;

    this.convivaAnalyticsTracker.trackAdStarted(adInfo, Conviva.Constants.AdType.CLIENT_SIDE, bitrateKbps);
    this.convivaAnalyticsTracker.trackPlaybackStateChanged(event);
  };

  private onAdFinished = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad finished', event);
    this.convivaAnalyticsTracker.trackAdFinished();
    this.convivaAnalyticsTracker.trackPlaybackStateChanged(event);
  };

  private onAdSkipped = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad skipped', event);
    this.convivaAnalyticsTracker.trackAdSkipped();
    this.onCustomEvent(event);
  };

  private onAdBreakFinished = (event: AdBreakEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] adbreak finished', event);
    this.convivaAnalyticsTracker.trackAdBreakFinished();
    this.convivaAnalyticsTracker.trackPlaybackStateChanged(event);
  };

  private onAdError = (event: ErrorEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad error', event);
    this.convivaAnalyticsTracker.trackAdError(event);
    this.onCustomEvent(event);
  };

  private onSeek = (event: SeekEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] seek', event);
    this.convivaAnalyticsTracker.trackSeekStart(event.seekTarget);
    this.onPlaybackStateChanged(event);
  };

  private onSeeked = (event: SeekEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] seeked', event);
    this.convivaAnalyticsTracker.trackSeekEnd();
    this.onPlaybackStateChanged(event);
  };

  private onTimeShift = (event: TimeShiftEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] time shift', event);
    // According to conviva it is valid to pass -1 for seeking in live streams
    this.convivaAnalyticsTracker.trackSeekStart(-1);
    this.onPlaybackStateChanged(event);
  };

  private onTimeShifted = (event: TimeShiftEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] time shifted', event);
    this.convivaAnalyticsTracker.trackSeekEnd();
    this.onPlaybackStateChanged(event);
  };

  private onAudioChanged = (event: AudioChangedEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] audio changed', event);
    this.convivaAnalyticsTracker.trackUpdateAudioTrack(event.targetAudio);
  };

  private onSubtitleEnabled = (event: SubtitleEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] subtitled enabled', event);
    this.convivaAnalyticsTracker.trackUpdateSubtitleTrack(event.subtitle);
  };

  private onSubtitleDisabled = (event: SubtitleEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] subtitles disabled', event);
    this.convivaAnalyticsTracker.trackTurnOffSubtitles();
  };

  private onError = (event: ErrorEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] error', event);
    this.convivaAnalyticsTracker.trackError(event);
  };

  private onDestroy = (event: any) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] destroy', event);
    this.releaseInternal(event);
  };

  private registerPlayerEvents(): void {
    this.handlers.add(PlayerEvent.Play, this.onPlay);
    this.handlers.add(PlayerEvent.Playing, this.onPlaying);
    this.handlers.add(PlayerEvent.Paused, this.onPlaybackStateChanged);
    this.handlers.add(PlayerEvent.StallStarted, this.onPlaybackStateChanged);
    this.handlers.add(PlayerEvent.StallEnded, this.onPlaybackStateChanged);
    this.handlers.add(PlayerEvent.PlaybackFinished, this.onPlaybackFinished);
    this.handlers.add(PlayerEvent.VideoPlaybackQualityChanged, this.onVideoQualityChanged);
    this.handlers.add(PlayerEvent.AudioPlaybackQualityChanged, this.onCustomEvent);
    this.handlers.add(PlayerEvent.Muted, this.onCustomEvent);
    this.handlers.add(PlayerEvent.Unmuted, this.onCustomEvent);
    this.handlers.add(PlayerEvent.ViewModeChanged, this.onCustomEvent);
    this.handlers.add(PlayerEvent.AdStarted, this.onAdStarted);
    this.handlers.add(PlayerEvent.AdFinished, this.onAdFinished);
    // TODO take from PlayerEvent when released
    this.handlers.add('contentpausing' as PlayerEvent, this.onAdBreakStarted);
    this.handlers.add('contentresuming' as PlayerEvent, this.onAdBreakFinished);
    this.handlers.add(PlayerEvent.AdSkipped, this.onAdSkipped);
    this.handlers.add(PlayerEvent.AdError, this.onAdError);
    this.handlers.add(PlayerEvent.Error, this.onError);
    this.handlers.add(PlayerEvent.Destroy, this.onDestroy);
    this.handlers.add(PlayerEvent.Seek, this.onSeek);
    this.handlers.add(PlayerEvent.Seeked, this.onSeeked);
    this.handlers.add(PlayerEvent.TimeShift, this.onTimeShift);
    this.handlers.add(PlayerEvent.TimeShifted, this.onTimeShifted);
    this.handlers.add(PlayerEvent.AudioChanged, this.onAudioChanged);
    this.handlers.add(PlayerEvent.SubtitleEnabled, this.onSubtitleEnabled);
    this.handlers.add(PlayerEvent.SubtitleDisabled, this.onSubtitleDisabled);

    this.handlers.add(PlayerEvent.CastStarted, this.onCustomEvent);
    this.handlers.add(PlayerEvent.CastStopped, this.onCustomEvent);
  }

  private unregisterPlayerEvents(): void {
    this.handlers?.clear();
  }
}
