import { PlayerEvent } from './PlayerEvent';
import {
  AdBreakEvent,
  AdEvent,
  PlaybackEvent,
  ErrorEvent,
  PlayerAPI,
  PlayerEventBase,
  PlayerEventCallback,
  SeekEvent,
  TimeShiftEvent,
  VideoPlaybackQualityChangedEvent,
  CastStartedEvent,
  AudioChangedEvent,
  SubtitleEvent,
  VideoQuality,
} from 'bitmovin-player';
import { ArrayUtils } from 'bitmovin-player-ui/dist/js/framework/arrayutils';
import * as Conviva from '@convivainc/conviva-js-coresdk';

declare const global: any;
export namespace MockHelper {
  export let latestVideoAnalytics: Conviva.VideoAnalytics;
  export let latestAdAnalytics: Conviva.AdAnalytics;

  export function createConvivaMock() {
    const ConvivaMock: Record<string, any> = {};

    ConvivaMock.SystemInterface = jest.fn();
    ConvivaMock.SystemSettings = jest.fn();
    ConvivaMock.SystemSettings.LogLevel = {
      WARNING: 'warning',
    };
    ConvivaMock.SystemFactory = jest.fn();
    ConvivaMock.ClientSettings = jest.fn();
    ConvivaMock.ContentMetadata = jest.fn();

    ConvivaMock.ContentMetadata.StreamType = {
      LIVE: 'live',
      VOD: 'vod',
      UNKNOWN: 'unknown',
    };
    ConvivaMock.Constants = {
      DeviceCategory: {
        WEB: 'WEB',
      },
      CallbackFunctions: {
        CONSOLE_LOG: 'CONSOLE_LOG',
        MAKE_REQUEST: 'MAKE_REQUEST',
        SAVE_DATA: 'SAVE_DATA',
        LOAD_DATA: 'LOAD_DATA',
      },
      PlayerState: {
        STOPPED: 'STOPPED',
        PLAYING: 'PLAYING',
        BUFFERING: 'BUFFERING',
        PAUSED: 'PAUSED',
        UNKNOWN: 'UNKNOWN',
        NOT_MONITORED: 'NOT_MONITORED',
      },
      Playback: {
        AUDIO_LANGUAGE: 'AUDIO_LANGUAGE',
        CLOSED_CAPTIONS_LANGUAGE: 'CLOSED_CAPTIONS_LANGUAGE',
        BITRATE: 'BITRATE',
        BUFFER_LENGTH: 'BUFFER_LENGTH',
        CDN_IP: 'CDN_IP',
        PLAYER_STATE: 'PLAYER_STATE',
        PLAY_HEAD_TIME: 'PLAY_HEAD_TIME',
        RENDERED_FRAMERATE: 'RENDERED_FRAMERATE',
        RESOLUTION: 'RESOLUTION',
        SEEK_ENDED: 'SEEK_ENDED',
        SEEK_STARTED: 'SEEK_STARTED',
        SUBTITLES_LANGUAGE: 'SUBTITLES_LANGUAGE',
      },
      ASSET_NAME: `assetName`,
      ENCODED_FRAMERATE: 'encodedFrameRate',
      DURATION: 'duration',
      DEFAULT_RESOURCE: 'defaultResource',
      STREAM_URL: 'streamUrl',
      FRAMEWORK_NAME: 'frameworkName',
      FRAMEWORK_VERSION: 'frameworkVersion',
      IS_LIVE: 'isLive',
      VIEWER_ID: 'viewerId',
      PLAYER_NAME: 'applicationName',
      StreamType: {
        UNKNOWN: 'unknown',
        LIVE: 'live',
        VOD: 'VOD',
      },
      ErrorSeverity: {
        FATAL: 1,
        WARNING: 0,
      },
      AdPosition: {
        MIDROLL: 'Mid-roll',
        PREROLL: 'Pre-roll',
        POSTROLL: 'Post-roll',
      },
      AdType: {
        CLIENT_SIDE: 'Client Side',
        SERVER_SIDE: 'Server Side',
      },
      AdPlayer: {
        CONTENT: 'CONTENT',
        SEPARATE: 'SEPARATE',
      },
      DeviceMetadata: {
        CATEGORY: 'CATEGORY',
      },
      LogLevel: {
        DEBUG: 'debug',
      },
    };
    ConvivaMock.Analytics = jest.fn();
    ConvivaMock.Analytics = {
      init: jest.fn(),
      release: jest.fn(),
      setDeviceMetadata: jest.fn(),
      updateContentMetadata: jest.fn(),
    };

    class MockVideoAnalytics implements Conviva.VideoAnalytics {
      configureExistingSession = jest.fn() as Conviva.VideoAnalytics['configureExistingSession'];
      reportPlaybackRequested = jest.fn() as Conviva.VideoAnalytics['reportPlaybackRequested']
      reportPlaybackFailed = jest.fn() as Conviva.VideoAnalytics['reportPlaybackFailed'];
      reportPlaybackEnded = jest.fn() as Conviva.VideoAnalytics['reportPlaybackEnded'];
      reportPlaybackError = jest.fn() as Conviva.VideoAnalytics['reportPlaybackError'];
      setContentInfo = jest.fn() as Conviva.VideoAnalytics['setContentInfo'];
      setPlayerInfo = jest.fn() as Conviva.VideoAnalytics['setPlayerInfo'];
      setPlayer = jest.fn() as Conviva.VideoAnalytics['setPlayer'];
      reportPlaybackMetric = jest.fn() as Conviva.VideoAnalytics['reportPlaybackMetric'];
      reportAdBreakStarted = jest.fn() as Conviva.VideoAnalytics['reportAdBreakStarted'];
      reportAdBreakEnded = jest.fn() as Conviva.VideoAnalytics['reportAdBreakEnded'];
      reportPlaybackEvent = jest.fn() as Conviva.VideoAnalytics['reportPlaybackEvent'];
      reportAppEvent = jest.fn() as Conviva.VideoAnalytics['reportAppEvent'];
      setCallback = jest.fn() as Conviva.VideoAnalytics['setCallback'];
      getSessionId = jest.fn() as Conviva.VideoAnalytics['getSessionId'];
      release = jest.fn() as Conviva.VideoAnalytics['release'];
    }

    ConvivaMock.Analytics.buildVideoAnalytics = (): Conviva.VideoAnalytics => {
      latestVideoAnalytics = new MockVideoAnalytics();

      return latestVideoAnalytics;
    };

    ConvivaMock.Analytics.buildAdAnalytics = (): Conviva.AdAnalytics => {
      latestAdAnalytics = {
        release: jest.fn() as Conviva.AdAnalytics['release'],
        reportAdEnded: jest.fn() as Conviva.AdAnalytics['reportAdEnded'],
        reportAdError: jest.fn() as Conviva.AdAnalytics['reportAdError'],
        reportAdFailed: jest.fn() as Conviva.AdAnalytics['reportAdFailed'],
        reportAdLoaded: jest.fn() as Conviva.AdAnalytics['reportAdLoaded'],
        reportAdMetric: jest.fn() as Conviva.AdAnalytics['reportAdMetric'],
        reportAdPlayerEvent: jest.fn() as Conviva.AdAnalytics['reportAdPlayerEvent'],
        reportAdSkipped: jest.fn() as Conviva.AdAnalytics['reportAdSkipped'],
        reportAdStarted: jest.fn() as Conviva.AdAnalytics['reportAdStarted'],
        setAdInfo: jest.fn() as Conviva.AdAnalytics['setAdInfo'],
        setAdListener: jest.fn() as Conviva.AdAnalytics['setAdListener'],
        setAdPlayerInfo: jest.fn() as Conviva.AdAnalytics['setAdPlayerInfo'],
        setCallback: jest.fn() as Conviva.AdAnalytics['setCallback'],
      } as Conviva.AdAnalytics;

      return latestAdAnalytics;
    };

    return ConvivaMock;
  }

  // Custom cast SDK implementation
  export function mockCastPlayerModule(): void {
    global.gcr = {};
    global.gcr.GoogleCastRemoteControlReceiver = jest.fn().mockImplementation(() => {
      return {
        setCastMetadataListener: jest.fn((callback) => {
          global.gcr.castMetadataListenerCallback = callback;
        }),
      };
    });
  }

  export function createPlayerMock(): {
    playerMock: PlayerAPI,
    playerEventHelper: PlayerEventHelper
  } {
    const playerEventHelper = new PlayerEventHelper();

    const PlayerMock: jest.Mock<PlayerAPI> = jest.fn().mockImplementation(() => {
      return {
        version: '8.0.0',
        getSource: jest.fn(),
        exports: {
          PlayerEvent,
          MetadataType: {
            CAST: 'CAST',
          },
        },
        getAudio: jest.fn(() => {
          return {
            id: 'en',
            lang: 'en',
            label: 'English',
            getQualities: jest.fn(),
          };
        }),
        getDuration: jest.fn(),
        getCurrentTime: jest.fn(),
        isLive: jest.fn(),
        getConfig: jest.fn(() => {
          return {};
        }),
        isPlaying: jest.fn().mockReturnValue(true),
        isPaused: jest.fn().mockReturnValue(false),
        isStalled: jest.fn().mockReturnValue(false),
        isCasting: jest.fn(),
        getPlayerType: jest.fn(),
        getStreamType: jest.fn(() => 'hls'),
        addMetadata: jest.fn((_, metadata) => {
          // Calling metadata listener
          if (global.gcr && global.gcr.castMetadataListenerCallback) {
            global.gcr.castMetadataListenerCallback(metadata);
          }
        }),
        subtitles: {
          list: jest.fn(() => {
            return [];
          }),
        },
        on: (eventType: PlayerEvent, callback: PlayerEventCallback) => playerEventHelper.on(eventType, callback),
        off: (eventType: PlayerEvent, callback: PlayerEventCallback) => playerEventHelper.off(eventType, callback),
        getPlaybackVideoData: jest.fn(() => {
          const data: VideoQuality = {
            bitrate: 1024,
            id: 'test-video-quality',
            width: 100,
            height: 100,
            frameRate: 60
          }
          return data;
        })
      };
    });

    const playerMock = new PlayerMock();

    return {
      playerMock,
      playerEventHelper
    }
  }
}

export class PlayerEventHelper {
  private eventHandlers: { [eventType: string]: PlayerEventCallback[] } = {};

  public on(eventType: PlayerEvent, callback: PlayerEventCallback) {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
  }

  public off(eventType: PlayerEvent, callback: PlayerEventCallback) {
    if (this.eventHandlers[eventType]) {
      ArrayUtils.remove(this.eventHandlers[eventType], callback);
    }
  }

  public fireEvent<E extends PlayerEventBase>(event: E) {
    if (this.eventHandlers[event.type]) {
      this.eventHandlers[event.type].forEach((callback: PlayerEventCallback) => callback(event));
    }
  }

  // Fake Events
  public firePlayEvent() {
    this.fireEvent<PlaybackEvent>({
      time: 0,
      timestamp: Date.now(),
      type: PlayerEvent.Play,
    });
  }

  public firePauseEvent() {
    this.fireEvent<PlaybackEvent>({
      time: 10,
      timestamp: Date.now(),
      type: PlayerEvent.Paused,
    });
  }

  fireAdBreakFinishedEvent(): void {
    this.fireEvent<AdBreakEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdBreakFinished,
      adBreak: {
        id: 'Break-ID',
        scheduleTime: -1,
      },
    });
  }

  fireAdBreakStartedEvent(startTime: number): void {
    this.fireEvent<AdBreakEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdBreakStarted,
      adBreak: {
        id: 'Break-ID',
        scheduleTime: startTime,
      },
    });
  }

  fireAdErrorEvent(): void {
    this.fireEvent<ErrorEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdError,
      code: 1001,
      name: 'AdErrorEvent',
      troubleShootLink: "http://troubleshoot-test-link"
    });
  }

  fireAdSkippedEvent(): void {
    this.fireEvent<AdEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdSkipped,
      ad: {
        isLinear: true,
        width: 0,
        height: 0,
      },
    });
  }

  fireAdStartedEvent(): void {
    this.fireEvent<AdEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdStarted,
      ad: {
        id: 'Ad-ID',
        isLinear: true,
        data: {
          bitrate: 1000,
        },
        width: 0,
        height: 0,
      },
    });
  }

  fireAdFinishedEvent(): void {
    this.fireEvent<AdEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdFinished,
      ad: {
        id: 'Ad-ID',
        isLinear: true,
        width: 0,
        height: 0,
      },
    });
  }

  fireErrorEvent(): void {
    this.fireEvent<ErrorEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.Error,
      code: 1000,
      name: 'ErrorEvent',
      troubleShootLink: "http://troubleshoot-test-link"
    });
  }

  firePlaybackFinishedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.PlaybackFinished,
    });
  }

  firePlayingEvent(): void {
    this.fireEvent<PlaybackEvent>({
      time: 0,
      timestamp: Date.now(),
      type: PlayerEvent.Playing,
    });
  }

  fireSeekEvent(seekTarget?: number): void {
    this.fireEvent<SeekEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.Seek,
      position: 20,
      seekTarget: seekTarget || 40,
    });
  }

  fireSeekedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.Seeked,
    });
  }

  fireSourceUnloadedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.SourceUnloaded,
    });
  }

  fireStallStartedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.StallStarted,
    });
  }

  fireStallEndedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.StallEnded,
    });
  }

  fireTimeShiftEvent(): void {
    this.fireEvent<TimeShiftEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.TimeShift,
      position: 0,
      target: -10,
    });
  }

  fireTimeShiftedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.TimeShifted,
    });
  }

  fireVideoPlaybackQualityChangedEvent(bitrate: number): void {
    this.fireEvent<VideoPlaybackQualityChangedEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.VideoPlaybackQualityChanged,
      sourceQuality: {
        id: '1',
        bitrate: 250_000,
        width: 0,
        height: 0,
      },
      targetQuality: {
        id: '2',
        bitrate: bitrate,
        width: 0,
        height: 0,
      },
    });
  }

  fireCastStartedEvent(resuming: boolean = false): void {
    this.fireEvent<CastStartedEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.CastStarted,
      deviceName: 'Awesome Device',
      resuming: resuming,
    });
  }

  fireCastStoppedEvent(): void {
    this.fireEvent<PlayerEventBase>({
      timestamp: Date.now(),
      type: PlayerEvent.CastStopped,
    });
  }

  fireCastWaitingForDevice(resuming: boolean = false): void {
    this.fireEvent<CastStartedEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.CastWaitingForDevice,
      deviceName: 'MyCastDevice',
      resuming: false,
    });
  }
  fireAudioChanged(): void {
    this.fireEvent<AudioChangedEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AudioChanged,
      sourceAudio: {
        id: 'en',
        lang: 'en',
        label: 'English',
        getQualities: jest.fn(),
      },
      targetAudio: {
        id: 'es',
        lang: 'es',
        label: 'Spanish',
        getQualities: jest.fn(),
      },
      time: 10,
    });
  }

  fireSubtitleEnabled(kind: string): void {
    this.fireEvent<SubtitleEvent>({
      subtitle: {
        id: 'en',
        kind: kind,
        lang: 'en',
        label: 'English',
      },
      timestamp: Date.now(),
      type: PlayerEvent.SubtitleEnabled,
    });
  }

  fireSubtitleDisabled(kind: string): void {
    this.fireEvent<SubtitleEvent>({
      subtitle: {
        id: 'en',
        kind: kind,
        lang: 'en',
        label: 'English',
      },
      timestamp: Date.now(),
      type: PlayerEvent.SubtitleDisabled,
    });
  }
}
