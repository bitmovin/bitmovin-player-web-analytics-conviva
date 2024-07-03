import * as Conviva from '@convivainc/conviva-js-coresdk';
import type {
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
import { ConvivaSsaiAnalytics } from './ConvivaSsaiAnalytics';
import { PlayerEventWrapper } from './helper/PlayerEventWrapper';

export class ConvivaAnalytics {
  private readonly events: typeof PlayerEvent;
  private readonly handlers: PlayerEventWrapper;
  private readonly convivaAnalyticsTracker: ConvivaAnalyticsTracker;

  private readonly debugLoggingEnabled: boolean;

  public readonly ssai: ConvivaSsaiAnalytics;

  constructor(player: PlayerAPI, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    this.convivaAnalyticsTracker = new ConvivaAnalyticsTracker(player, customerKey, config);

    this.debugLoggingEnabled = config.debugLoggingEnabled || false;


    // TODO: Use alternative to deprecated player.exports
    this.events = player.exports.PlayerEvent;

    this.handlers = new PlayerEventWrapper(player);

    this.registerPlayerEvents();

    this.ssai = new ConvivaSsaiAnalytics(this.convivaAnalyticsTracker);
  }

  public initializeSession(): void {
    this.convivaAnalyticsTracker.initializeSession();
  }

  public endSession(): void {
    this.convivaAnalyticsTracker.endSession();
  }

  public sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.convivaAnalyticsTracker.sendCustomApplicationEvent(eventName, eventAttributes);
  }

  public sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.convivaAnalyticsTracker.sendCustomPlaybackEvent(eventName, eventAttributes);
  }

  public updateContentMetadata(metadataOverrides: Partial<Metadata>) {
    this.convivaAnalyticsTracker.updateContentMetadata(metadataOverrides);
  }

  public reportPlaybackDeficiency(
    message: string,
    severity: Conviva.valueof<Conviva.ConvivaConstants['ErrorSeverity']>,
    endSession: boolean = true,
  ) {
    this.convivaAnalyticsTracker.reportPlaybackDeficiency(message, severity, endSession);
  }

  public pauseTracking(): void {
    this.convivaAnalyticsTracker.pauseTracking();
  }

  public resumeTracking(): void {
    this.convivaAnalyticsTracker.resumeTracking();
  }

  public release(): void {
    this.destroy();
    this.convivaAnalyticsTracker.release();
  }

  private destroy(event?: PlayerEventBase): void {
    this.unregisterPlayerEvents();
    this.convivaAnalyticsTracker.release(event);
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
    this.convivaAnalyticsTracker.trackAdBreakStarted(event);
  };

  private onAdStarted = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad started', event);
    this.convivaAnalyticsTracker.trackAdStarted(event);
  }

  private onAdFinished = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad finished', event);
    this.convivaAnalyticsTracker.trackAdFinished(event);
  }

  private onAdSkipped = (event: AdEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] ad skipped', event);
    this.convivaAnalyticsTracker.trackAdSkipped(event);
    this.onCustomEvent(event);
  };

  private onAdBreakFinished = (event: AdBreakEvent) => {
    this.debugLog('[ ConvivaAnalytics ] [ Player Event ] adbreak finished', event);
    this.convivaAnalyticsTracker.trackAdBreakFinished(event);
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
    this.destroy(event);
  };

  private registerPlayerEvents(): void {
    this.handlers.add(this.events.Play, this.onPlay);
    this.handlers.add(this.events.Playing, this.onPlaying);
    this.handlers.add(this.events.Paused, this.onPlaybackStateChanged);
    this.handlers.add(this.events.StallStarted, this.onPlaybackStateChanged);
    this.handlers.add(this.events.StallEnded, this.onPlaybackStateChanged);
    this.handlers.add(this.events.PlaybackFinished, this.onPlaybackFinished);
    this.handlers.add(this.events.VideoPlaybackQualityChanged, this.onVideoQualityChanged);
    this.handlers.add(this.events.AudioPlaybackQualityChanged, this.onCustomEvent);
    this.handlers.add(this.events.Muted, this.onCustomEvent);
    this.handlers.add(this.events.Unmuted, this.onCustomEvent);
    this.handlers.add(this.events.ViewModeChanged, this.onCustomEvent);
    this.handlers.add(this.events.AdStarted, this.onAdStarted);
    this.handlers.add(this.events.AdFinished, this.onAdFinished);
    this.handlers.add(this.events.AdBreakStarted, this.onAdBreakStarted);
    this.handlers.add(this.events.AdBreakFinished, this.onAdBreakFinished);
    this.handlers.add(this.events.AdSkipped, this.onAdSkipped);
    this.handlers.add(this.events.AdError, this.onAdError);
    this.handlers.add(this.events.Error, this.onError);
    this.handlers.add(this.events.Destroy, this.onDestroy);
    this.handlers.add(this.events.Seek, this.onSeek);
    this.handlers.add(this.events.Seeked, this.onSeeked);
    this.handlers.add(this.events.TimeShift, this.onTimeShift);
    this.handlers.add(this.events.TimeShifted, this.onTimeShifted);
    this.handlers.add(this.events.AudioChanged, this.onAudioChanged);
    this.handlers.add(this.events.SubtitleEnabled, this.onSubtitleEnabled);
    this.handlers.add(this.events.SubtitleDisabled, this.onSubtitleDisabled);

    this.handlers.add(this.events.CastStarted, this.onCustomEvent);
    this.handlers.add(this.events.CastStopped, this.onCustomEvent);
  }

  private unregisterPlayerEvents(): void {
    this.handlers.clear();
  }

  static get version(): string {
    return ConvivaAnalyticsTracker.version;
  }
}
