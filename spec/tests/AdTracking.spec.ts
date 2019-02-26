import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';

describe('ad tracking', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let clientMock: Conviva.Client;
  let playerStateMock: Conviva.PlayerStateManager;

  beforeEach(() => {
    MockHelper.mockConviva();

    playerMock = MockHelper.getPlayerMock();
    clientMock = MockHelper.getConvivaClientMock();
    playerStateMock = clientMock.getPlayerStateManager();

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
    playerMock.eventEmitter.firePlayEvent();
    playerMock.eventEmitter.firePlayingEvent();
  });

  it('track pre-roll ad', () => {
    playerMock.eventEmitter.fireAdBreakStartedEvent(0);
    playerMock.eventEmitter.fireAdStartedEvent();
    expect(clientMock.adStart).toHaveBeenCalledTimes(1);
    expect(clientMock.adStart).toHaveBeenCalledWith(0, 'separate', 'content', Conviva.Client.AdPosition.PREROLL);
  });

  it('track  mid-roll ad', () => {
    playerMock.eventEmitter.fireAdBreakStartedEvent(5);
    playerMock.eventEmitter.fireAdStartedEvent();
    expect(clientMock.adStart).toHaveBeenCalledTimes(1);
    expect(clientMock.adStart).toHaveBeenCalledWith(0, 'separate', 'content', Conviva.Client.AdPosition.MIDROLL);
  });

  it('end session on post-roll ad', () => {
    playerMock.eventEmitter.fireAdBreakStartedEvent(Infinity);
    playerMock.eventEmitter.fireAdStartedEvent();
    expect(clientMock.adStart).toHaveBeenCalledTimes(0);
    expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
  });

  describe('track ad end', () => {
    beforeEach(() => {
      playerMock.eventEmitter.fireAdBreakStartedEvent(0);
      playerMock.eventEmitter.fireAdStartedEvent();
    });

    it('on adError', () => {
      playerMock.eventEmitter.fireAdErrorEvent();
      playerMock.eventEmitter.fireAdBreakFinishedEvent();
      expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
      expect(clientMock.sendCustomEvent).toHaveBeenCalledTimes(1);
      expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(0, 'aderror', {});
    });

    it('on ad skipped', () => {
      playerMock.eventEmitter.fireAdSkippedEvent();
      playerMock.eventEmitter.fireAdBreakFinishedEvent();
      expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
      expect(clientMock.sendCustomEvent).toHaveBeenCalledTimes(1);
      expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(0, 'adskipped', {});
    });

    it('on ad end', () => {
      playerMock.eventEmitter.fireAdBreakFinishedEvent();
      expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('ad event workarounds', () => {
    describe('event order in case of pre-roll ad', () => {
      it('track pre-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(0);
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();
        playerMock.eventEmitter.fireAdStartedEvent();

        expect(clientMock.adStart).toHaveBeenCalledTimes(1);
        expect(clientMock.adStart).toHaveBeenCalledWith(0, 'separate', 'content', Conviva.Client.AdPosition.PREROLL);
      });
    });
  });
});

