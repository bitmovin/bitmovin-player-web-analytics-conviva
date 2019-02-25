/// <reference path='../../src/ts/Conviva.d.ts'/>
import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';

jest.mock('../../src/ts/Html5Logging');

describe('content metadata spec', () => {

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

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('when initialization session', () => {
    it('set asset name', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
        assetName: 'Asset Title',
      }));
    });

    it('set player type in custom tags', () => {
      jest.spyOn(playerMock, 'getPlayerType').mockReturnValue('native');
      playerMock.eventEmitter.firePlayEvent();

      expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
        custom: expect.objectContaining({
          playerType: 'native',
        }),
      }));
    });

    it('set stream url', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
        streamUrl: 'test.m3u8',
      }));
    });

    describe('when updating session', () => {
      it('does not update video duration', () => {
        jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
        playerMock.eventEmitter.firePlayEvent();
        jest.spyOn(playerMock, 'getDuration').mockReturnValue(1); // different to initial value
        playerMock.eventEmitter.firePlayingEvent();

        expect(clientMock.updateContentMetadata).toHaveBeenLastCalledWith(0, expect.objectContaining({
          duration: 10,
        }));
      });
    });

    describe('externally content metadata updates', () => {
      describe('before playback started (with init session event)', () => {
        beforeEach(() => {
          jest.spyOn(playerMock, 'getSource').mockReturnValue(undefined);
        });

        describe('it does create session with', () => {
          it('viewerId', () => {
            convivaAnalytics.updateContentMetadata({ viewerId: 'newId', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              viewerId: 'newId',
            }));
          });

          it('streamType', () => {
            convivaAnalytics.updateContentMetadata({
              streamType: Conviva.ContentMetadata.StreamType.UNKNOWN,
              assetName: 'MyAsset',
            });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              streamType: 'unknown',
            }));
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              applicationName: 'someValue',
            }));
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' }, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              custom: expect.objectContaining({
                myTag: 'withMyValue',
              }),
            }));
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              duration: 55,
            }));
          });

          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144, assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              encodedFrameRate: 144,
            }));
          });

          it('defaultResrouce', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              defaultResource: 'someValue',
            }));
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url', assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              streamUrl: 'http://some.url',
            }));
          });

          it('assetName', () => {
            convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
            convivaAnalytics.initializeSession();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              assetName: 'MyAsset',
            }));
          });
        });
      });

      describe('before playback started (with play event)', () => {
        describe('it does update', () => {
          it('viewerId', () => {
            convivaAnalytics.updateContentMetadata({ viewerId: 'newId' });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              viewerId: 'newId',
            }));
          });

          it('streamType', () => {
            convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              streamType: 'unknown',
            }));
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              applicationName: 'someValue',
            }));
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              custom: expect.objectContaining({
                myTag: 'withMyValue',
              }),
            }));
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55 });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              duration: 55,
            }));
          });

          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              encodedFrameRate: 144,
            }));
          });

          it('defaultResrouce', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              defaultResource: 'someValue',
            }));
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              streamUrl: 'http://some.url',
            }));
          });

          it('assetName', () => {
            convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
            playerMock.eventEmitter.firePlayEvent();
            expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
              assetName: 'MyAsset',
            }));
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

            expect(clientMock.updateContentMetadata).not.toHaveBeenLastCalledWith(0, expect.objectContaining({
              viewerId: 'newId',
            }));
          });

          it('streamType', () => {
            convivaAnalytics.updateContentMetadata({ streamType: Conviva.ContentMetadata.StreamType.UNKNOWN });

            expect(clientMock.updateContentMetadata).not.toHaveBeenLastCalledWith(0, expect.objectContaining({
              streamType: 'UNKNOWN',
            }));
          });

          it('applicationname', () => {
            convivaAnalytics.updateContentMetadata({ applicationName: 'someValue' });

            expect(clientMock.updateContentMetadata).not.toHaveBeenLastCalledWith(0, expect.objectContaining({
              applicationName: 'someValue',
            }));
          });

          it('custom tags', () => {
            convivaAnalytics.updateContentMetadata({ custom: { myTag: 'withMyValue' } });

            expect(clientMock.updateContentMetadata).not.toHaveBeenLastCalledWith(0, expect.objectContaining({
              custom: expect.objectContaining({
                myTag: undefined,
              }),
            }));
          });

          it('duration', () => {
            convivaAnalytics.updateContentMetadata({ duration: 55 });

            expect(clientMock.updateContentMetadata).not.toHaveBeenLastCalledWith(0, expect.objectContaining({
              duration: 55,
            }));
          });
        });

        describe('it does update', () => {
          it('encoded frame rate', () => {
            convivaAnalytics.updateContentMetadata({ encodedFrameRate: 144 });

            expect(clientMock.updateContentMetadata).toHaveBeenLastCalledWith(0, expect.objectContaining({
              encodedFrameRate: 144,
            }));
          });

          it('defaultResource', () => {
            convivaAnalytics.updateContentMetadata({ defaultResource: 'someValue' });

            expect(clientMock.updateContentMetadata).toHaveBeenLastCalledWith(0, expect.objectContaining({
              defaultResource: 'someValue',
            }));
          });

          it('streamUrl', () => {
            convivaAnalytics.updateContentMetadata({ streamUrl: 'http://some.url' });

            expect(clientMock.updateContentMetadata).toHaveBeenLastCalledWith(0, expect.objectContaining({
              streamUrl: 'http://some.url',
            }));
          });
        });
      });

      it('not overriding custom metadata', () => {
        jest.spyOn(playerMock, 'getPlayerType').mockReturnValue('native');
        convivaAnalytics.updateContentMetadata({ custom: { playerType: 'someValue' } });

        playerMock.eventEmitter.firePlayEvent();

        expect(clientMock.createSession).not.toHaveBeenLastCalledWith(expect.objectContaining({
          custom: expect.objectContaining({
            playerType: 'someValue',
          }),
        }));

        expect(clientMock.createSession).toHaveBeenLastCalledWith(expect.objectContaining({
          custom: expect.objectContaining({
            playerType: 'native',
          }),
        }));
      });
    });
  });
});
