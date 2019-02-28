import { AdTrackingMode, ConvivaAnalytics, ConvivaAnalyticsConfiguration } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { AdData, LinearAd, VastAdData } from 'bitmovin-player';
import { AD_SESSION_KEY, CONTENT_SESSION_KEY } from '../helper/TestsHelper';

describe('ad tracking', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let clientMock: Conviva.Client;
  let playerStateMock: Conviva.PlayerStateManager;

  beforeEach(() => {
    MockHelper.mockConviva();

    playerMock = MockHelper.getPlayerMock();

    playerMock.ads.getModuleInfo = jest.fn(() => ({
      name: 'bitmovin-advertising',
      version: 'x.y.z',
    }));

    clientMock = MockHelper.getConvivaClientMock();
    playerStateMock = clientMock.getPlayerStateManager();
    jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
  });

  [AdTrackingMode.Basic, AdTrackingMode.AdBreaks, AdTrackingMode.AdInsights].forEach((adTrackingMode) => {
    describe('core ad tracking for tracking mode: ' + adTrackingMode, () => {
      let expectedSessionKey: number;

      beforeEach(() => {
        let convivaConfig: ConvivaAnalyticsConfiguration = {
          adTrackingMode,
        };
        convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY', convivaConfig);

        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();

        expectedSessionKey = adTrackingMode === AdTrackingMode.AdInsights ? AD_SESSION_KEY : CONTENT_SESSION_KEY;
      });

      it('track pre-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(0);
        playerMock.eventEmitter.fireAdStartedEvent();
        expect(clientMock.adStart).toHaveBeenCalledTimes(1);
        expect(clientMock.adStart).toHaveBeenCalledWith(
          CONTENT_SESSION_KEY,
          'separate',
          'content',
          Conviva.Client.AdPosition.PREROLL,
        );
      });

      it('track mid-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(5);
        playerMock.eventEmitter.fireAdStartedEvent();
        expect(clientMock.adStart).toHaveBeenCalledTimes(1);
        expect(clientMock.adStart).toHaveBeenCalledWith(
          CONTENT_SESSION_KEY,
          'separate',
          'content',
          Conviva.Client.AdPosition.MIDROLL,
        );
      });

      it('track post-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(Infinity);
        playerMock.eventEmitter.fireAdStartedEvent();
        expect(clientMock.adStart).toHaveBeenCalledTimes(1);
        expect(clientMock.adStart).toHaveBeenCalledWith(
          CONTENT_SESSION_KEY,
          'separate',
          'content',
          Conviva.Client.AdPosition.POSTROLL,
        );
      });

      describe('track ad end', () => {
        beforeEach(() => {
          playerMock.eventEmitter.fireAdBreakStartedEvent(0);
          playerMock.eventEmitter.fireAdStartedEvent();
        });

        it('on adError', () => {
          playerMock.eventEmitter.fireAdErrorEvent();

          expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(expectedSessionKey, 'aderror', {});

          playerMock.eventEmitter.fireAdBreakFinishedEvent();
          expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
        });

        it('on ad skipped', () => {
          playerMock.eventEmitter.fireAdSkippedEvent();
          playerMock.eventEmitter.fireAdBreakFinishedEvent();
          expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
          expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(expectedSessionKey, 'adskipped', {});
        });

        it('on ad end', () => {
          playerMock.eventEmitter.fireAdBreakFinishedEvent();
          expect(clientMock.adEnd).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('ad event workarounds', () => {
    beforeEach(() => {
      convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');
    });

    describe('event order in case of pre-roll ad', () => {
      it('track pre-roll ad', () => {
        playerMock.eventEmitter.fireAdBreakStartedEvent(0);
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();
        playerMock.eventEmitter.fireAdStartedEvent();

        expect(clientMock.adStart).toHaveBeenCalledWith(
          CONTENT_SESSION_KEY,
          'separate',
          'content',
          Conviva.Client.AdPosition.PREROLL,
        );
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
    let adData: VastAdData = {};

    beforeEach(() => {
      let convivaConfig: ConvivaAnalyticsConfiguration = {
        adTrackingMode: AdTrackingMode.AdInsights,
      };

      convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY', convivaConfig);

      playerMock.eventEmitter.firePlayEvent();
      playerMock.eventEmitter.firePlayingEvent();
    });

    describe('session handling', () => {
      beforeEach(() => {
        playerMock.eventEmitter.fireAdBreakStartedEvent();
        playerMock.eventEmitter.fireAdStartedEvent();
      });

      it('create a session on adStarted', () => {
        expect(clientMock.createAdSession).toHaveBeenCalledTimes(AD_SESSION_KEY);
      });

      it('closes an active session on adFinished', () => {
        playerMock.eventEmitter.fireAdFinishedEvent();

        expect(clientMock.cleanupSession).toHaveBeenCalledWith(AD_SESSION_KEY);
      });

      describe('report to ad session', () => {
        it('playback changes', () => {
          playerMock.eventEmitter.firePauseEvent();

          // TODO: test explicitly against playerStateManager of ad session
          expect(playerStateMock.setPlayerState).toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.PAUSED);
        });

        it('custom events', () => {
          playerMock.eventEmitter.fireAdSkippedEvent();

          expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(AD_SESSION_KEY, 'adskipped', expect.anything());
        });
      });
    });

    describe('adMetadata handling', () => {
      beforeEach(() => {
        playerMock.eventEmitter.fireAdBreakStartedEvent();
      });

      describe('assetName', () => {
        it('is taken from adData', () => {
          adData = {
            adTitle: 'MyAdAssetName',
          };

          playerMock.eventEmitter.fireAdStartedEvent({}, adData); // TODO: extract with lazy adData object initialization

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            assetName: 'MyAdAssetName',
          }));
        });

        it('is NA if not present', () => {
          playerMock.eventEmitter.fireAdStartedEvent();

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            assetName: 'NA',
          }));
        });
      });

      describe('streamUrl', () => {
        it('is taken from then ad', () => {
          playerMock.eventEmitter.fireAdStartedEvent({
            mediaFileUrl: 'http://my.url',
          });

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            streamUrl: 'http://my.url',
          }));
        });
      });

      describe('duration', () => {
        it('is taken from the ad', () => {
          playerMock.eventEmitter.fireAdStartedEvent({
            duration: 5,
          });

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            duration: 5,
          }));
        });
      });

      describe('custom', () => {
        it('does not include empty values', () => {
          playerMock.eventEmitter.fireAdStartedEvent();

          const lastCallAttributes = (clientMock.createAdSession as jest.Mock).mock.calls.pop();
          const contentMetadata = lastCallAttributes[1] as Conviva.ContentMetadata;

          const customValues = Object.keys(contentMetadata.custom).map((key) => (contentMetadata as any).custom[key]);

          expect(customValues).toEqual(expect.not.arrayContaining([undefined]));
        });

        it('collects data from adData object', () => {
          playerMock.eventEmitter.fireAdStartedEvent({}, {
            adSystem: {
              name: 'AdSystem Name',
            },
            apiFramework: 'APIFramework',
            creative: {
              adId: 'myId',
              universalAdId: {
                value: 'AwesomeCreativeName',
                idRegistry: null,
              },
            },
            advertiser: {
              name: 'MyAdvertiser',
              id: 'AdvertiserID',
            },
          });

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            custom: expect.objectContaining({
              'c3.ad.system': 'AdSystem Name',
              'c3.ad.mediaFileApiFramework': 'APIFramework',
              'c3.ad.creativeId': 'myId',
              'c3.ad.creativeName': 'AwesomeCreativeName',
              'c3.ad.advertiser': 'MyAdvertiser',
              'c3.ad.advertiserId': 'AdvertiserID',
            }),
          }));
        });

        it('respects the yospace integration', () => {
          playerMock.ads.getModuleInfo = jest.fn(() => ({
            name: 'something-with-yospace-in-the-name',
            version: 'x.y.z',
          }));

          playerMock.eventEmitter.fireAdStartedEvent();

          expect(clientMock.createAdSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            custom: expect.objectContaining({
              'c3.ad.technology': 'Server Side',
              'c3.ad.adStitcher': 'Yospace',
            }),
          }));
        });
      });
    });
  });
});

