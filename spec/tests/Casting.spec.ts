import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { CONTENT_SESSION_KEY } from '../helper/TestsHelper';

declare const global: any;

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
    it('it doesn\'t create a session', () => {
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
        playerMock.eventEmitter.fireCastWaitingForDevice();

        expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
      });
    });

    describe('when cast stopped', () => {
      beforeEach(() => {
        (clientMock.createSession as jest.Mock).mockClear();
        playerMock.eventEmitter.fireCastWaitingForDevice();
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

  // TODO: consider moving to ContentMetadata specs
  describe('and content metadata handling', () => {
    let receiverConvivaAnalytics: ConvivaAnalytics;
    let receiverPlayerMock: TestingPlayerAPI;
    let receiverConvivaAnalyticsClientMock: Conviva.Client;

    beforeEach(() => {
      receiverPlayerMock = MockHelper.getPlayerMock();

      receiverConvivaAnalytics = new ConvivaAnalytics(receiverPlayerMock, 'TEST-KEY');
      // Find more information why we need the private client in MockHelper.ts#getConvivaClientMock
      receiverConvivaAnalyticsClientMock = (receiverConvivaAnalytics as any).client;
    });

    const startPlayback = () => {
      playerMock.eventEmitter.firePlayEvent();
      playerMock.eventEmitter.firePlayingEvent();
    };

    const mockPlayerCastModule = () => {
      // Mock cast player implementation
      MockHelper.mockCastPlayerModule();
      // This actually mocks something the customer needs to do
      global.gcr.castMetadataListenerCallback = (metadata: any) => {
        receiverConvivaAnalytics.handleCastMetadataEvent(metadata);
      };
    };

    describe('propagates all content metadata to receiver instance', () => {
      it('when cast started during playback', () => {
        convivaAnalytics.updateContentMetadata({
          custom: {
            customTagForCastTest: 'With Value',
          },
        });

        startPlayback();
        mockPlayerCastModule();

        playerMock.eventEmitter.fireCastStartedEvent();

        expect(receiverConvivaAnalyticsClientMock.updateContentMetadata).toHaveBeenNthCalledWith(
          1,
          CONTENT_SESSION_KEY,
          expect.objectContaining({
            custom: expect.objectContaining({
              customTagForCastTest: 'With Value',
            }),
          }),
        );
      });

      it('when calling update content metadata on the sender instance', () => {
        startPlayback();
        mockPlayerCastModule();

        playerMock.eventEmitter.fireCastStartedEvent();

        convivaAnalytics.updateContentMetadata({ encodedFrameRate: 260 });
        expect(receiverConvivaAnalyticsClientMock.updateContentMetadata).toHaveBeenNthCalledWith(
          1,
          CONTENT_SESSION_KEY,
          expect.objectContaining({
            encodedFrameRate: 260,
          }),
        );
      });
    });
  });
});
