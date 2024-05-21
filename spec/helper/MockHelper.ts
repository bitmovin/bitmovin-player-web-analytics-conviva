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
} from 'bitmovin-player';
import { ArrayUtils } from 'bitmovin-player-ui/dist/js/framework/arrayutils';

declare const global: any;
export namespace MockHelper {
  export function createConvivaMock() {
    const ConvivaMock: Record<string, any> = {};

    ConvivaMock.SystemInterface = jest.fn().mockImplementation();
    ConvivaMock.SystemSettings = jest.fn().mockImplementation();
    ConvivaMock.SystemSettings.LogLevel = {
      WARNING: 'warning',
    };
    ConvivaMock.SystemFactory = jest.fn().mockImplementation();
    ConvivaMock.ClientSettings = jest.fn().mockImplementation();
    ConvivaMock.ContentMetadata = jest.fn().mockImplementation();

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
    const reportPlaybackRequested = jest.fn();

    const reportPlaybackFailed = jest.fn();

    const reportPlaybackEnded = jest.fn();

    const setContentInfo = jest.fn();

    const setPlayerInfo = jest.fn();

    const reportPlaybackMetric = jest.fn();

    const reportDeviceMetric = jest.fn();

    const reportAdBreakStarted = jest.fn();

    const reportAdBreakEnded = jest.fn();

    const setCallback = jest.fn();

    const getSessionId = jest.fn();

    const reportPlaybackEvent = jest.fn();

    const reportAppEvent = jest.fn();

    const release = jest.fn();
    ConvivaMock.Analytics = jest.fn().mockImplementation();
    ConvivaMock.Analytics = {
      init: jest.fn().mockImplementation(),
      release: jest.fn().mockImplementation(),
      setDeviceMetadata: jest.fn().mockImplementation(),
      updateContentMetadata: jest.fn().mockImplementation(),
    };

    ConvivaMock.Analytics.buildVideoAnalytics = jest.fn().mockImplementation(() => {
      return {
        reportPlaybackRequested,
        reportPlaybackFailed,
        reportPlaybackEnded,
        setContentInfo,
        setPlayerInfo,
        reportPlaybackMetric,
        reportDeviceMetric,
        reportAdBreakStarted,
        reportAdBreakEnded,
        reportPlaybackEvent,
        reportAppEvent,
        setCallback,
        getSessionId,
        release,
      };
    });

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

  export function getPlayerMock(): TestingPlayerAPI {
    const eventHelper = new PlayerEventHelper();

    const PlayerMockClass: jest.Mock<TestingPlayerAPI> = jest.fn().mockImplementation(() => {
      return {
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
        isPlaying: jest.fn(),
        isPaused: jest.fn(),
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

        // Event faker
        eventEmitter: eventHelper,
        on: eventHelper.on.bind(eventHelper),
        off: eventHelper.off.bind(eventHelper),
      };
    });

    return new PlayerMockClass();
  }
}

export interface TestingPlayerAPI extends PlayerAPI {
  eventEmitter: EventEmitter;
}

interface EventEmitter {
  fireEvent<E extends PlayerEventBase>(event: E): void;

  // Event Helper methods
  firePlayEvent(): void;

  firePauseEvent(): void;

  firePlayingEvent(): void;

  fireSourceUnloadedEvent(): void;

  firePlaybackFinishedEvent(): void;

  fireSeekEvent(seekTarget?: number): void;

  fireSeekedEvent(): void;

  fireTimeShiftEvent(): void;

  fireTimeShiftedEvent(): void;

  fireStallStartedEvent(): void;

  fireStallEndedEvent(): void;

  fireErrorEvent(): void;

  fireAdBreakStartedEvent(startTime: number): void;

  fireAdStartedEvent(): void;

  fireAdBreakFinishedEvent(): void;

  fireAdSkippedEvent(): void;

  fireAdErrorEvent(): void;

  fireVideoPlaybackQualityChangedEvent(bitrate: number): void;

  fireCastStartedEvent(resuming?: boolean): void;

  fireCastWaitingForDevice(resuming?: boolean): void;

  fireCastStoppedEvent(): void;

  fireAudioChanged(): void;

  fireSubtitleEnabled(kind: string): void;

  fireSubtitleDisabled(kind: string): void;
}

class PlayerEventHelper implements EventEmitter {
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
