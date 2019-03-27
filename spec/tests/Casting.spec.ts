import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';

describe('casting', () => {
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
  });

  describe('when player is casting initial', () => {
    it('it doens\'t create a session', () => {
      playerMock.eventEmitter.fireCastStartedEvent(true);
      playerMock.eventEmitter.firePlayingEvent();

      expect(clientMock.createSession).not.toHaveBeenCalled();
    });
  });

  describe('during playback', () => {
    beforeEach(() => {
      playerMock.eventEmitter.firePlayEvent();
      playerMock.eventEmitter.firePlayingEvent();
    });

    describe('when cast started', () => {
      it('session gets closed', () => {
        playerMock.eventEmitter.fireCastStartedEvent();

        expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
      });
    });

    describe('when cast stopped', () => {
      beforeEach(() => {
        (clientMock.createSession as jest.Mock).mockClear();
        playerMock.eventEmitter.fireCastStartedEvent();
      });

      describe('and the player is playing', () => {
        it('session gets created', () => {
          jest.spyOn(playerMock, 'isPlaying').mockReturnValue(true);
          playerMock.eventEmitter.fireCastStoppedEvent();

          expect(clientMock.createSession).toHaveBeenCalledTimes(1);
        });
      });

      describe('and the player is not playing', () => {
        it('session gets created on Play', () => {
          jest.spyOn(playerMock, 'isPlaying').mockReturnValue(false);

          playerMock.eventEmitter.fireCastStoppedEvent();
          expect(clientMock.createSession).not.toHaveBeenCalled();

          playerMock.eventEmitter.firePlayEvent();
          expect(clientMock.createSession).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
