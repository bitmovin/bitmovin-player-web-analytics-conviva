/// <reference path='../src/ts/Conviva.d.ts'/>
import { PlayerAPI } from 'bitmovin-player';

declare const global: any;
export namespace TestHelper {

  export function mockConviva(): void {
    global.Conviva = { };
    global.Conviva.SystemInterface = jest.fn().mockImplementation();
    global.Conviva.SystemSettings = jest.fn().mockImplementation();
    global.Conviva.SystemFactory = jest.fn().mockImplementation();
    global.Conviva.ClientSettings = jest.fn().mockImplementation();
    global.Conviva.ContentMetadata = jest.fn().mockImplementation();
  }

  export function getConvivaClientMock(): Partial<Conviva.Client> {
    const customEventFunction = jest.fn();
    const clientMock: jest.Mock<Conviva.Client> = jest.fn().mockImplementation(() => ({
      sendCustomEvent: customEventFunction,
    }));

    global.Conviva.Client = clientMock;
    global.Conviva.Client.NO_SESSION_KEY = -2;

    return {
      sendCustomEvent: customEventFunction,
    };
  }

  export function getPlayerMock(): jest.Mock<PlayerAPI> {
    const player: jest.Mock<PlayerAPI> = jest.fn().mockImplementation(() => ({
      getSource: jest.fn(),
    }));

    return player;
  }

}
