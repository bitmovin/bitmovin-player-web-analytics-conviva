import { AdTrackingMode, ConvivaAnalytics, ConvivaAnalyticsConfiguration } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { LinearAd } from 'bitmovin-player';

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
    jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
  });

  [AdTrackingMode.Basic, AdTrackingMode.AdBreaks, AdTrackingMode.AdInsights].forEach((adTrackingMode) => {
    describe('core ad tracking for tracking mode: ' + adTrackingMode, () => {
      beforeEach(() => {
        let convivaConfig: ConvivaAnalyticsConfiguration = {
          adTrackingMode,
        };
        convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY', convivaConfig);

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
          expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(0, 'aderror', {});
        });

        it('on ad skipped', () => {
          playerMock.eventEmitter.fireAdSkippedEvent();
          playerMock.eventEmitter.fireAdBreakFinishedEvent();
          expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
          expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(0, 'adskipped', {});
        });

        it('on ad end', () => {
          playerMock.eventEmitter.fireAdBreakFinishedEvent();
          expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('ad event workarounds', () => {
    describe('event order in case of pre-roll ad', () => {
      it('track pre-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(0);
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();
        playerMock.eventEmitter.fireAdStartedEvent();

        expect(clientMock.adStart).toHaveBeenCalledWith(0, 'separate', 'content', Conviva.Client.AdPosition.PREROLL);
      });
    });
  });

  describe('AdBreak tracking', () => {
    beforeEach(() => {
      let convivaConfig: ConvivaAnalyticsConfiguration = {
        adTrackingMode: AdTrackingMode.AdBreaks,
      };

      convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY', convivaConfig);

      playerMock.eventEmitter.firePlayEvent();
      playerMock.eventEmitter.firePlayingEvent();
    });

    it('track custom event when ad break starts', () => {
      playerMock.eventEmitter.fireAdBreakStartedEvent();
      expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(expect.anything(), 'Conviva.PodStart', expect.anything());
    });

    it('track custom event when ad break ends', () => {
      playerMock.eventEmitter.fireAdBreakStartedEvent();
      playerMock.eventEmitter.fireAdBreakFinishedEvent();
      expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(expect.anything(), 'Conviva.PodEnd', expect.anything());
    });

    describe('track AdPod attributes', () => {
      ['Start', 'End'].forEach((adBreakEvent) => {
        describe('for Pod' + adBreakEvent, () => {
          beforeEach(() => {
            playerMock.eventEmitter.fireAdBreakStartedEvent(
              0,
              [
                {
                  isLinear: true,
                  duration: 3,
                  width: null,
                  height: null,
                } as LinearAd,
                {
                  isLinear: true,
                  duration: 5,
                  width: null,
                  height: null,
                } as LinearAd,
                {
                  isLinear: true,
                  duration: 2,
                  width: null,
                  height: null,
                } as LinearAd,
              ],
            );

            if (adBreakEvent === 'End') {
              playerMock.eventEmitter.fireAdBreakFinishedEvent();
            }
          });

          it('duration of adBreak', () => {
            expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
              expect.anything(),
              'Conviva.Pod' + adBreakEvent,
              expect.objectContaining({
                podDuration: '10',
              }),
            );
          });

          describe('podPosition', () => {
            it('contains PreRoll podPosition', () => {
              expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
                expect.anything(),
                'Conviva.Pod' + adBreakEvent,
                expect.objectContaining({
                  podPosition: Conviva.Client.AdPosition.PREROLL,
                }),
              );
            });

            // TODO: find proper solution to set duration in beforeEach block to different values here
            // it('contains MidRoll podPosition', () => {
            //   expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
            //     expect.anything(),
            //     'Conviva.Pod' + adBreakEvent,
            //     expect.objectContaining({
            //       podPosition: Conviva.Client.AdPosition.MIDROLL,
            //     }),
            //   );
            // });
            //
            // it('contains PostRoll podPosition', () => {
            //   expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
            //     expect.anything(),
            //     'Conviva.Pod' + adBreakEvent,
            //     expect.objectContaining({
            //       podPosition: Conviva.Client.AdPosition.POSTROLL,
            //     }),
            //   );
            // });
          });

          describe('podIndex', () => {
            it('is 1 for first adBreak', () => {
              expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
                expect.anything(),
                'Conviva.Pod' + adBreakEvent,
                expect.objectContaining({
                  podIndex: '1',
                }),
              );
            });

            it('is 3 for third adBreak', () => {
              // Fake third adBreak (first end will be fired in before each)
              playerMock.eventEmitter.fireAdBreakStartedEvent();
              playerMock.eventEmitter.fireAdBreakFinishedEvent();
              playerMock.eventEmitter.fireAdBreakStartedEvent();
              playerMock.eventEmitter.fireAdBreakFinishedEvent();

              expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(
                expect.anything(),
                'Conviva.Pod' + adBreakEvent,
                expect.objectContaining({
                  podIndex: '3',
                }),
              );
            });
          });
        });
      });
    });
  });

  describe('Ad Insights Tracking', () => {

  });
});

