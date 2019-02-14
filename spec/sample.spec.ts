/// <reference path='../src/ts/Conviva.d.ts'/>

import { ConvivaAnalytics } from '../src/ts';
import { TestHelper, TestingPlayerAPI } from './TestHelper';

describe('tests', () => {
  beforeEach(() => {
    TestHelper.mockConviva();
  });

  describe('sendCustomApplicationEvent()', () => {
    it('sends custom application event', () => {
      const clientMock = TestHelper.getConvivaClientMock();
      let convivaAnalytics = new ConvivaAnalytics(TestHelper.getPlayerMock(), 'TEST-KEY');

      convivaAnalytics.sendCustomApplicationEvent('Test Event');

      expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(-2, 'Test Event', {});
    });

  });

  describe('initializeSession', () => {
    it('on Play event', () => {
      const playerMock: TestingPlayerAPI = TestHelper.getPlayerMock();
      const clientMock = TestHelper.getConvivaClientMock();
      const playerStateMock = clientMock.getPlayerStateManager();

      const convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

      playerMock.fakePlayEvent();

      expect(clientMock.createSession).toHaveBeenCalled();
      expect(playerStateMock.setPlayerState).toHaveBeenCalled();
    });
  });
});
