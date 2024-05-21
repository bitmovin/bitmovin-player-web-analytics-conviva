import { PlayerType, StreamType, VRContentType } from 'bitmovin-player';
import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import * as Conviva from '@convivainc/conviva-js-coresdk';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe('content metadata spec', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let convivaVideoAnalytics: Conviva.VideoAnalytics;

  beforeEach(() => {
    playerMock = MockHelper.getPlayerMock();
    convivaVideoAnalytics = Conviva.Analytics.buildVideoAnalytics();

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('when initialization session', () => {
    it('set asset name', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          assetName: 'Asset Title',
        }),
      );
    });

    it('sets the default playerType in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue(PlayerType.Native);
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          playerType: 'native',
        }),
      );
    });

    it('sets the default streamType in custom tags', () => {
      jest.spyOn(playerMock, 'getStreamType').mockReturnValue(StreamType.Dash);
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          streamType: 'dash',
        }),
      );
    });

    it('sets the default vrContentType in custom tags', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vrContentType: undefined,
        }),
      );
    });

    it('do not override playerType in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue(PlayerType.Native);
      jest.spyOn(playerMock, 'getStreamType').mockReturnValue(StreamType.Dash);
      convivaAnalytics.updateContentMetadata({ custom: { playerType: PlayerType.Html5 }, assetName: 'MyAsset' });
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
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
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          playerType: PlayerType.Native,
          streamType: StreamType.Dash,
        }),
      );
    });

    it('do not override vrContentType in custom tags', () => {
      convivaAnalytics.updateContentMetadata({ custom: { vrContentType: VRContentType.Single }, assetName: 'MyAsset' });
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vrContentType: undefined,
        }),
      );
    });

    it('set stream url', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
        expect.objectContaining({
          streamUrl: 'test.m3u8',
        }),
      );
    });

    describe('when updating session', () => {
      it('does not update video duration', () => {
        jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
        playerMock.eventEmitter.firePlayEvent();
        jest.spyOn(playerMock, 'getDuration').mockReturnValue(1); // different to initial value
        playerMock.eventEmitter.firePlayingEvent();

        expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
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
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
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
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                isLive: 'unknown',
              }),
            );
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                applicationName: 'someValue',
              }),
            );
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' }, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({ myTag: 'withMyValue' }),
            );
          });

          it('additional standard tags', () => {
            convivaAnalytics.updateContentMetadata({ additionalStandardTags: { 'c3.cm.brand': 'Test Brand' }, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({ 'c3.cm.brand': 'Test Brand' }),
            );
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                duration: 55,
              }),
            );
          });

          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                encodedFrameRate: 144,
              }),
            );
          });

          it('defaultResrouce', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                defaultResource: 'someValue',
              }),
            );
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                streamUrl: 'http://some.url',
              }),
            );
          });

          it('assetName', () => {
            convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
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
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                viewerId: 'newId',
              }),
            );
          });

          it('streamType', () => {
            convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                isLive: 'unknown',
              }),
            );
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                applicationName: 'someValue',
              }),
            );
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({ myTag: 'withMyValue' }),
            );
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55 });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                duration: 55,
              }),
            );
          });

          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                encodedFrameRate: 144,
              }),
            );
          });

          it('defaultResrouce', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                defaultResource: 'someValue',
              }),
            );
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                streamUrl: 'http://some.url',
              }),
            );
          });

          it('assetName', () => {
            convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
            playerMock.eventEmitter.firePlayEvent();
            expect(convivaVideoAnalytics.reportPlaybackRequested).toHaveBeenLastCalledWith(
              expect.objectContaining({
                assetName: 'MyAsset',
              }),
            );
          });
        });
      });

      describe('after playback started', () => {
        beforeEach(() => {
          playerMock.eventEmitter.firePlayEvent();
          playerMock.eventEmitter.firePlayingEvent();
        });

        describe('it does not updated', () => {
          it('viewerId', () => {
            convivaAnalytics.updateContentMetadata({ viewerId: 'newId' });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
              0,
              expect.objectContaining({
                viewerId: 'newId',
              }),
            );
          });

          it('streamType', () => {
            convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
              0,
              expect.objectContaining({
                isLive: 'UNKNOWN',
              }),
            );
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenLastCalledWith(
              0,
              expect.objectContaining({
                applicationName: 'someValue',
              }),
            );
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
              expect.objectContaining({ myTag: 'withMyValue' })
            );
          });

          it('additional tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { 'c3.cm.brand': 'Test Brand' } });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
              expect.objectContaining({ 'c3.cm.brand': 'Test Brand' })
            );
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55 });

            expect(convivaVideoAnalytics.setContentInfo).not.toHaveBeenCalledWith(
              expect.objectContaining({
                duration: 55,
              }),
            );
          });
        });

        describe('it does update', () => {
          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });

            expect(convivaVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
              expect.objectContaining({
                encodedFrameRate: 144,
              }),
            );
          });

          it('defaultResource', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });

            expect(convivaVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
              expect.objectContaining({
                defaultResource: 'someValue',
              }),
            );
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });

            expect(convivaVideoAnalytics.setContentInfo).toHaveBeenLastCalledWith(
              expect.objectContaining({
                streamUrl: 'http://some.url',
              }),
            );
          });
        });
      });
    });
  });
});
