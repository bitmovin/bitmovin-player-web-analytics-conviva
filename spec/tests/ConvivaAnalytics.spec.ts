import { PlayerAPI, PlayerType, StreamType, VRContentType } from 'bitmovin-player';
import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, PlayerEventHelper } from '../helper/MockHelper';
import * as Conviva from '@convivainc/conviva-js-coresdk';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe(ConvivaAnalytics, () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: PlayerAPI;
  let playerEventHelper: PlayerEventHelper

  beforeEach(() => {
    ({ playerMock, playerEventHelper } = MockHelper.createPlayerMock());

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('when initialization session', () => {
    it('set asset name', () => {
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          assetName: 'Asset Title',
        }),
      );
    });

    it('sets the default playerType in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue(PlayerType.Native);
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          playerType: 'native',
        }),
      );
    });

    it('sets the default streamType in custom tags', () => {
      jest.spyOn(playerMock, 'getStreamType').mockReturnValue(StreamType.Dash);
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          streamType: 'dash',
        }),
      );
    });

    it('sets the default vrContentType in custom tags', () => {
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vrContentType: undefined,
        }),
      );
    });

    it('do not override playerType in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue(PlayerType.Native);
      jest.spyOn(playerMock, 'getStreamType').mockReturnValue(StreamType.Dash);
      convivaAnalytics.updateContentMetadata({ custom: { playerType: PlayerType.Html5 }, assetName: 'MyAsset' });
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          playerType: PlayerType.Native,
          streamType: StreamType.Dash,
        }),
      );
    });

    it('do not override streamType in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue(PlayerType.Native);
      jest.spyOn(playerMock, 'getStreamType').mockReturnValue(StreamType.Dash);
      convivaAnalytics.updateContentMetadata({ custom: { streamType: 'dash_vod' }, assetName: 'MyAsset' });
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          playerType: PlayerType.Native,
          streamType: StreamType.Dash,
        }),
      );
    });

    it('do not override vrContentType in custom tags', () => {
      convivaAnalytics.updateContentMetadata({ custom: { vrContentType: VRContentType.Single }, assetName: 'MyAsset' });
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vrContentType: undefined,
        }),
      );
    });

    it('set stream url', () => {
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          streamUrl: 'test.m3u8',
        }),
      );
    });

    it('set player info', () => {
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.setPlayerInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frameworkName: 'Bitmovin Player',
          frameworkVersion: '8.0.0',
        }),
      );
    });
  });

  describe('when updating session', () => {
    it('does not update video duration', () => {
      jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
      playerEventHelper.firePlayEvent();
      jest.spyOn(playerMock, 'getDuration').mockReturnValue(1); // different to initial value
      playerEventHelper.firePlayingEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          duration: 10,
        }),
      );
    });
  });

  describe('externally content metadata updates', () => {
    describe('before playback started (with init session event)', () => {
      beforeEach(() => {
        jest.spyOn(playerMock, 'getSource').mockReturnValue(null);
      });

      describe('it does create session with', () => {
        it('viewerId', () => {
          convivaAnalytics.updateContentMetadata({ viewerId: 'newId', assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              viewerId: 'newId',
            }),
          );
        });

        it('streamType', () => {
          convivaAnalytics.updateContentMetadata({
            streamType: Conviva.Constants.StreamType.UNKNOWN,
            assetName: 'MyAsset',
          });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              isLive: 'unknown',
            }),
          );
        });

        it('applicationname', () => {
          convivaAnalytics.updateContentMetadata({ applicationName: 'someValue', assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              applicationName: 'someValue',
            }),
          );
        });

        it('custom tags', () => {
          convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' }, assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({ myTag: 'withMyValue' }),
          );
        });

        it('additional standard tags', () => {
          convivaAnalytics.updateContentMetadata({ additionalStandardTags: { 'c3.cm.brand': 'Test Brand' }, assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({ 'c3.cm.brand': 'Test Brand' }),
          );
        });

        it('duration', () => {
          convivaAnalytics.updateContentMetadata({ duration: 55, assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              duration: 55,
            }),
          );
        });

        it('encoded frame rate', () => {
          convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144, assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              encodedFrameRate: 144,
            }),
          );
        });

        it('defaultResrouce', () => {
          convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue', assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              defaultResource: 'someValue',
            }),
          );
        });

        it('streamUrl', () => {
          convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url', assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              streamUrl: 'http://some.url',
            }),
          );
        });

        it('assetName', () => {
          convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
          convivaAnalytics.initializeSession();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              assetName: 'MyAsset',
            }),
          );
        });
      });
    });

    describe('before playback started (with play event)', () => {
      describe('it does update', () => {
        it('viewerId', () => {
          convivaAnalytics.updateContentMetadata({ viewerId: 'newId' });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              viewerId: 'newId',
            }),
          );
        });

        it('streamType', () => {
          convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              isLive: 'unknown',
            }),
          );
        });

        it('applicationname', () => {
          convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              applicationName: 'someValue',
            }),
          );
        });

        it('custom tags', () => {
          convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({ myTag: 'withMyValue' }),
          );
        });

        it('duration', () => {
          convivaAnalytics.updateContentMetadata({ duration: 55 });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              duration: 55,
            }),
          );
        });

        it('encoded frame rate', () => {
          convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              encodedFrameRate: 144,
            }),
          );
        });

        it('defaultResrouce', () => {
          convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              defaultResource: 'someValue',
            }),
          );
        });

        it('streamUrl', () => {
          convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              streamUrl: 'http://some.url',
            }),
          );
        });

        it('assetName', () => {
          convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
          playerEventHelper.firePlayEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
            expect.objectContaining({
              assetName: 'MyAsset',
            }),
          );
        });
      });
    });

    describe('after playback started', () => {
      beforeEach(() => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.firePlayingEvent();
      });

      it('reports player state', () => {
        playerEventHelper.firePauseEvent();
        expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenLastCalledWith(Conviva.Constants.Playback.PLAYER_STATE, Conviva.Constants.PlayerState.PAUSED);
      })

      describe('it does not updated', () => {
        it('viewerId', () => {
          convivaAnalytics.updateContentMetadata({ viewerId: 'newId' });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
            0,
            expect.objectContaining({
              viewerId: 'newId',
            }),
          );
        });

        it('streamType', () => {
          convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
            0,
            expect.objectContaining({
              isLive: 'UNKNOWN',
            }),
          );
        });

        it('applicationname', () => {
          convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
            0,
            expect.objectContaining({
              applicationName: 'someValue',
            }),
          );
        });

        it('custom tags', () => {
          convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
            expect.objectContaining({ myTag: 'withMyValue' })
          );
        });

        it('additional tags', () => {
          convivaAnalytics.updateContentMetadata({ custom: { 'c3.cm.brand': 'Test Brand' } });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
            expect.objectContaining({ 'c3.cm.brand': 'Test Brand' })
          );
        });

        it('duration', () => {
          convivaAnalytics.updateContentMetadata({ duration: 55 });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
            expect.objectContaining({
              duration: 55,
            }),
          );
        });
      });

      describe('it does update', () => {
        it('encoded frame rate', () => {
          convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
            expect.objectContaining({
              encodedFrameRate: 144,
            }),
          );
        });

        it('defaultResource', () => {
          convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
            expect.objectContaining({
              defaultResource: 'someValue',
            }),
          );
        });

        it('streamUrl', () => {
          convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });

          expect(MockHelper.latestVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
            expect.objectContaining({
              streamUrl: 'http://some.url',
            }),
          );
        });
      });
    });
  });

  describe("ad", () => {
    describe('when initialization session', () => {
      it('set ad player info', () => {
        playerEventHelper.firePlayEvent();

        expect(MockHelper.latestAdAnalytics.setAdPlayerInfo).toHaveBeenLastCalledWith(
          expect.objectContaining({
            frameworkName: 'Bitmovin Player',
            frameworkVersion: '8.0.0',
          }),
        );
      });
    });

    describe('after playback started', () => {
      beforeEach(() => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.firePlayingEvent();
      });

      it('reports ad player state', () => {
        playerEventHelper.fireAdBreakStartedEvent(0);
        playerEventHelper.firePauseEvent();
        expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenLastCalledWith(Conviva.Constants.Playback.PLAYER_STATE, Conviva.Constants.PlayerState.PAUSED);
      })

      it('reports ad started', () => {
        playerEventHelper.fireAdBreakStartedEvent(0);
        playerEventHelper.fireAdStartedEvent();

        expect(MockHelper.latestAdAnalytics.reportAdStarted).toHaveBeenCalledWith({
          [Conviva.Constants.ASSET_NAME]: 'NA',
          [Conviva.Constants.STREAM_URL]: 'NA',
          "c3.ad.creativeId": "NA",
          "c3.ad.firstAdId": 'Ad-ID',
          "c3.ad.firstAdSystem": "NA",
          "c3.ad.firstCreativeId": "NA",
          "c3.ad.id": 'Ad-ID',
          "c3.ad.mediaFileApiFramework": "NA",
          "c3.ad.position": Conviva.Constants.AdPosition.PREROLL,
          "c3.ad.system": "NA",
          "c3.ad.technology": Conviva.Constants.AdType.CLIENT_SIDE
        });
      });

      it('reports ad bitrate', () => {
        playerEventHelper.fireAdBreakStartedEvent(0);
        playerEventHelper.fireAdStartedEvent();

        expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.BITRATE, 1000);
      })

      it('reports ad finished', () => {
        playerEventHelper.fireAdFinishedEvent();

        expect(MockHelper.latestAdAnalytics.reportAdEnded).toHaveBeenCalled();
      })

      it('reports ad skipped', () => {
        playerEventHelper.fireAdSkippedEvent();

        expect(MockHelper.latestAdAnalytics.reportAdSkipped).toHaveBeenCalled();
      })

      it('reports ad error', () => {
        playerEventHelper.fireAdErrorEvent();

        expect(MockHelper.latestAdAnalytics.reportAdError).toHaveBeenCalledWith(
          'Ad error: AdErrorEvent; Message: Unknown message; Error code: 1001; Troubleshoot link: http://troubleshoot-test-link',
          Conviva.Constants.ErrorSeverity.WARNING
        );
      })
    });
  })

  describe("late player attaching", () => {
    convivaAnalytics = new ConvivaAnalytics(undefined, 'TEST-KEY');

    it("initializes session with asset name from source", () => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue({
        hls: 'test.m3u8',
        title: 'Asset Title',
      });
      convivaAnalytics.updateContentMetadata({ assetName: undefined });

      expect(() => convivaAnalytics.initializeSession()).not.toThrow();
    })

    it("initializes session with asset name from metadata", () => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue(undefined);
      convivaAnalytics.updateContentMetadata({ assetName: undefined });

      expect(() => convivaAnalytics.initializeSession()).toThrow();
    })

    it("fails to initialize session if there is no asset name available", () => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue(null);
      convivaAnalytics.updateContentMetadata({ assetName: undefined });

      expect(() => convivaAnalytics.initializeSession()).toThrow();
    })

    it("attaches player after session initialization", () => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue({
        hls: 'test.m3u8',
        title: 'Asset Title',
      });

      convivaAnalytics.initializeSession();
      convivaAnalytics.attachPlayer(playerMock);

      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.setPlayerInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frameworkName: 'Bitmovin Player',
          frameworkVersion: '8.0.0',
        }),
      );
    })
  })
});
