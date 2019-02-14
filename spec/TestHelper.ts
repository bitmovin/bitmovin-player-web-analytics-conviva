/// <reference path='../src/ts/Conviva.d.ts'/>
import { PlayerEvent } from './PlayerEvent';
import { PlaybackEvent, Player, PlayerAPI, PlayerEventBase, PlayerEventCallback } from 'bitmovin-player';

declare const global: any;
export namespace TestHelper {

  export function mockConviva(): void {
    global.Conviva = { };
    global.Conviva.SystemInterface = jest.fn().mockImplementation();
    global.Conviva.SystemSettings = jest.fn().mockImplementation();
    global.Conviva.SystemFactory = jest.fn().mockImplementation();
    global.Conviva.ClientSettings = jest.fn().mockImplementation();
    global.Conviva.ContentMetadata = jest.fn().mockImplementation();
    global.Conviva.ContentMetadata.StreamType = {
      LIVE: 'live',
      VOD: 'vod',
    };
  }

  export function getConvivaClientMock(): Conviva.Client {
    const createSession = jest.fn();
    const sendCustomEvent = jest.fn();

    const playerStateMock = getPlayerStateManagerMock();

    global.Conviva.Client = jest.fn().mockImplementation(() => {
      return {
        sendCustomEvent,
        getPlayerStateManager: jest.fn(() => playerStateMock),
        createSession,
        attachPlayer: jest.fn(),
      };
    });

    global.Conviva.Client.NO_SESSION_KEY = -2;

    return new global.Conviva.Client();
  }

  export function getPlayerStateManagerMock(): Conviva.PlayerStateManager {
    const setPlayerState = jest.fn();

    const PlayerStateManagerClass = jest.fn().mockImplementation(() => ({
      setPlayerType: jest.fn(),
      setPlayerVersion: jest.fn(),
      setPlayerState,
    }));

    global.Conviva.PlayerStateManager = PlayerStateManagerClass;
    global.Conviva.PlayerStateManager.PlayerState = {
      STOPPED: 'stopped',
    };

    return new PlayerStateManagerClass();
  }

  export function getPlayerMock(): TestingPlayerAPI {
    const eventHelper = new PlayerEventHelper();

    const PlayerMockClass: jest.Mock<TestingPlayerAPI> = jest.fn().mockImplementation(() => {

      // Wrapping all methods from PlayerEventHelper to the player mock to easily trigger certain events
      let wrappedEventMethods: any = {};

      for (let member in eventHelper) {
        if (typeof (eventHelper as any)[member] === 'function') {
          wrappedEventMethods[member] = function () {
            return (eventHelper as any)[member].apply(eventHelper, arguments);
          };
        }
      }

      return {
        getSource: jest.fn(),
        exports: { PlayerEvent },
        getDuration: jest.fn(),
        isLive: jest.fn(),
        getConfig: jest.fn(() => {
          return {};
        }),

        // Event faker
        ...wrappedEventMethods,
      };
    });

    return new PlayerMockClass();
  }
}

export interface TestingPlayerAPI extends PlayerAPI {
  fakeEvent<E extends PlayerEventBase>(event: E): void;

  // Event Helper methods
  fakePlayEvent(): void;
}

class PlayerEventHelper {
  private eventHandlers: { [eventType: string]: PlayerEventCallback[]; } = {};

  public on(eventType: PlayerEvent, callback: PlayerEventCallback) {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
  }

  public fakeEvent<E extends PlayerEventBase>(event: E) {
    if (this.eventHandlers[event.type]) {
      this.eventHandlers[event.type].forEach((callback: PlayerEventCallback) => callback(event));
    }
  }

  public fakePlayEvent() {
    this.fakeEvent<PlaybackEvent>({
      time: 0,
      timestamp: Date.now(),
      type: PlayerEvent.Play,
    });
  }
}
