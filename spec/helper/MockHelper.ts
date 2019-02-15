/// <reference path='../../src/ts/Conviva.d.ts'/>
import { PlayerEvent } from './PlayerEvent';
import {
  AdBreak,
  AdBreakEvent, AdEvent,
  PlaybackEvent, ErrorEvent,
  Player,
  PlayerAPI,
  PlayerEventBase,
  PlayerEventCallback, SeekEvent, TimeShiftEvent,
} from 'bitmovin-player';

declare const global: any;
export namespace MockHelper {

  export function mockConviva(): void {
    global.Conviva = {};
    global.Conviva.SystemInterface = jest.fn().mockImplementation();
    global.Conviva.SystemSettings = jest.fn().mockImplementation();
    global.Conviva.SystemSettings.LogLevel = {
      WARNING: 'warning',
    };
    global.Conviva.SystemFactory = jest.fn().mockImplementation();
    global.Conviva.ClientSettings = jest.fn().mockImplementation();
    global.Conviva.ContentMetadata = jest.fn().mockImplementation();
    global.Conviva.ContentMetadata.StreamType = {
      LIVE: 'live',
      VOD: 'vod',
      UNKNOWN: 'unknown',
    };
  }

  export function getConvivaClientMock(): Conviva.Client {
    const createSession = jest.fn(() => 0);
    const cleanupSession = jest.fn();
    const sendCustomEvent = jest.fn();
    const updateContentMetadata = jest.fn();
    const adStart = jest.fn();
    const adEnd = jest.fn();
    const reportError = jest.fn();
    const releasePlayerStateManager = jest.fn();

    const playerStateMock = getPlayerStateManagerMock();

    global.Conviva.Client = jest.fn().mockImplementation(() => {
      return {
        sendCustomEvent,
        getPlayerStateManager: jest.fn(() => playerStateMock),
        releasePlayerStateManager,
        createSession,
        attachPlayer: jest.fn(),
        detachPlayer: jest.fn(),
        cleanupSession,
        updateContentMetadata,
        adStart,
        adEnd,
        reportError,
      };
    });

    global.Conviva.Client.NO_SESSION_KEY = -2;

    global.Conviva.Client.AdPosition = {
      PREROLL: 'preroll',
    };
    global.Conviva.Client.AdStream = {
      SEPARATE: 'separate',
    };
    global.Conviva.Client.AdPlayer = {
      SEPARATE: 'separate',
      CONTENT: 'content',
    };
    global.Conviva.Client.ErrorSeverity = {
      FATAL: 'fatal',
    };

    return new global.Conviva.Client();
  }

  export function getPlayerStateManagerMock(): Conviva.PlayerStateManager {
    const setPlayerState = jest.fn();
    const setPlayerSeekStart = jest.fn();
    const setPlayerSeekEnd = jest.fn();

    const PlayerStateManagerClass = jest.fn().mockImplementation(() => ({
      setPlayerType: jest.fn(),
      setPlayerVersion: jest.fn(),
      setPlayerState,
      setPlayerSeekStart,
      setPlayerSeekEnd,
    }));

    global.Conviva.PlayerStateManager = PlayerStateManagerClass;
    global.Conviva.PlayerStateManager.PlayerState = {
      STOPPED: 'stopped',
      BUFFERING: 'buffering',
      PAUSED: 'paused',
      PLAYING: 'playing',
    };

    return new PlayerStateManagerClass();
  }

  export function getPlayerMock(): TestingPlayerAPI {
    const eventHelper = new PlayerEventHelper();

    const PlayerMockClass: jest.Mock<TestingPlayerAPI> = jest.fn().mockImplementation(() => {
      return {
        getSource: jest.fn(),
        exports: { PlayerEvent },
        getDuration: jest.fn(),
        isLive: jest.fn(),
        getConfig: jest.fn(() => {
          return {};
        }),
        isPlaying: jest.fn(),
        isPaused: jest.fn(),
        getPlayerType: jest.fn(),
        getStreamType: jest.fn(() => 'hls'),

        // Event faker
        eventEmitter: eventHelper,
        on: eventHelper.on.bind(eventHelper),
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
}

class PlayerEventHelper implements EventEmitter {
  private eventHandlers: { [eventType: string]: PlayerEventCallback[]; } = {};

  public on(eventType: PlayerEvent, callback: PlayerEventCallback) {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
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
      },
    });
  }

  fireAdStartedEvent(): void {
    this.fireEvent<AdEvent>({
      timestamp: Date.now(),
      type: PlayerEvent.AdStarted,
      ad: {
        isLinear: true,
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
}
