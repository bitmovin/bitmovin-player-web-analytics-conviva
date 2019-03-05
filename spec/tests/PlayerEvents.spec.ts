/// <reference path='../../src/ts/Conviva.d.ts'/>

import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { ConvivaAnalytics } from '../../src/ts';

describe('player event tests', () => {
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

  describe('player event handling', () => {
    describe('initialize session', () => {
      it('on play', () => {
        playerMock.eventEmitter.firePlayEvent();

        expect(clientMock.createSession).toHaveBeenCalledTimes(1);
      });

      it('on error', () => {
        playerMock.eventEmitter.fireErrorEvent();

        expect(clientMock.createSession).toHaveBeenCalledTimes(1);
      });
    });

    describe('initialize player state manager', () => {
      it('on playing', () => {
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();

        expect(clientMock.getPlayerStateManager).toHaveBeenCalledTimes(1);
      });
    });

    describe('de-initialize player state manager', () => {
      it('on playback finished', () => {
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlaybackFinishedEvent();

        expect(clientMock.releasePlayerStateManager).toHaveBeenCalledTimes(1);
      });
    });

    describe('update playback state', () => {
      beforeEach(() => {
        playerMock.eventEmitter.firePlayEvent();
      });

      it('on playing', () => {
        jest.spyOn(playerMock, 'isPaused').mockReturnValue(false);
        jest.spyOn(playerMock, 'isPlaying').mockReturnValue(true);
        playerMock.eventEmitter.firePlayingEvent();

        expect(playerStateMock.setPlayerState).toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.PLAYING);
      });

      it('on pause', () => {
        jest.spyOn(playerMock, 'isPlaying').mockReturnValue(false);
        jest.spyOn(playerMock, 'isPaused').mockReturnValue(true);
        playerMock.eventEmitter.firePauseEvent();

        expect(playerStateMock.setPlayerState).toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.PAUSED);
      });

    });
    it('should not crash here', () => {
      jest.spyOn(playerMock, 'isPaused').mockReturnValue(true);
      playerMock.eventEmitter.firePauseEvent();

      expect(playerStateMock.setPlayerState).not.toHaveBeenCalled();
    });

    describe('v8 stalling handling', () => {
      // In v8 there is no stalling event between play / playing; seek / seeked; timeshift / thimeshifted but it
      // can be treated as stalling so we need to report it (maybe timeout in favor of seeking in buffer)

      describe('reports stalling', () => {
        it('delayed after play', (done: any) => {
          playerMock.eventEmitter.firePlayEvent();
          // TODO: check if delayed is testable
          setTimeout(function () {
            expect(playerStateMock.setPlayerState).toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
            done();
          }, 120);
        });
        describe('durring playback', () => {
          beforeEach(() => {
            playerMock.eventEmitter.firePlayEvent();
            playerMock.eventEmitter.firePlayingEvent();
          });

          it('delayed after seek', () => {
            playerMock.eventEmitter.fireSeekEvent();
          });

          it('delayed after timeshift', () => {
            playerMock.eventEmitter.fireTimeShiftEvent();
          });

          it('right after stall started', () => {
            playerMock.eventEmitter.fireStallStartedEvent();
          });

          afterEach((done: any) => {
            setTimeout(function () {
              expect(playerStateMock.setPlayerState).toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
              done();
            }, 120);
          });
        });
      });

      describe('does not report stalling', () => {
        it('when content is preloaded', (done: any) => {
          playerMock.eventEmitter.firePlayEvent();
          setTimeout(() => {
            playerMock.eventEmitter.firePlayingEvent();

            expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
            setTimeout(() => {
              expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
              done();
            }, 2000);
          }, 30);
        });
      });

      describe('when buffer is ready', () => {
        beforeEach(() => {
          playerMock.eventEmitter.firePlayEvent();
          playerMock.eventEmitter.firePlayingEvent();
        });

        it('and seeking', (done: any) => {
          playerMock.eventEmitter.fireSeekEvent();
          setTimeout(() => {
            playerMock.eventEmitter.fireSeekedEvent();

            expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
            setTimeout(() => {
              expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
              done();
            }, 2000);
          }, 30);
        });

        it('and time shifting', (done: any) => {
          playerMock.eventEmitter.fireTimeShiftEvent();
          setTimeout(() => {
            playerMock.eventEmitter.fireTimeShiftedEvent();

            expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
            setTimeout(() => {
              expect(playerStateMock.setPlayerState).not.toHaveBeenCalledWith(Conviva.PlayerStateManager.PlayerState.BUFFERING);
              done();
            }, 2000);
          }, 30);
        });
      });
    });

    describe('end session', () => {
      beforeEach(() => {
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();
      });
      it('on source unloaded', () => {
        playerMock.eventEmitter.fireSourceUnloadedEvent();

        expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
      });

      it('on error', () => {
        playerMock.eventEmitter.fireErrorEvent();

        expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
      });

      it('playback finished', () => {
        playerMock.eventEmitter.firePlaybackFinishedEvent();

        expect(clientMock.cleanupSession).toHaveBeenCalledTimes(1);
      });
    });

    describe('seeking', () => {
      beforeEach(() => {
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();
      });

      describe('track seek start', () => {
        it('on seek', () => {
          playerMock.eventEmitter.fireSeekEvent(50.145);
          expect(playerStateMock.setPlayerSeekStart).toHaveBeenCalledTimes(1);
          expect(playerStateMock.setPlayerSeekStart).toHaveBeenCalledWith(50);
        });

        it('on timeshift', () => {
          playerMock.eventEmitter.fireTimeShiftEvent();
          expect(playerStateMock.setPlayerSeekStart).toHaveBeenCalledTimes(1);
          expect(playerStateMock.setPlayerSeekStart).toHaveBeenCalledWith(-1);
        });
      });

      describe('track seek end', () => {
        it('on seeked', () => {
          playerMock.eventEmitter.fireSeekedEvent();
          expect(playerStateMock.setPlayerSeekEnd).toHaveBeenCalledTimes(1);
        });

        it('on timeshifted', () => {
          playerMock.eventEmitter.fireTimeShiftedEvent();
          expect(playerStateMock.setPlayerSeekEnd).toHaveBeenCalledTimes(1);
        });
      });
    });
    it('does not track seek if play never happened', () => {
      playerMock.eventEmitter.fireSeekEvent();
      expect(playerStateMock.setPlayerSeekStart).not.toHaveBeenCalled();
    });
  });

  describe('ad tracking', () => {
    beforeEach(() => {
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
  });

  describe('bitrate tracking', () => {
    it('report bitrate on event', () => {
      playerMock.eventEmitter.firePlayEvent();
      playerMock.eventEmitter.firePlayingEvent();
      playerMock.eventEmitter.fireVideoPlaybackQualityChangedEvent(2_400_000);

      expect(playerStateMock.setBitrateKbps).toHaveBeenCalledWith(2_400);
    });

    describe('event order workaround', () => {
      it('track current bitrate on session initialization', () => {
        playerMock.eventEmitter.fireVideoPlaybackQualityChangedEvent(4_800_000);
        playerMock.eventEmitter.firePlayEvent();
        playerMock.eventEmitter.firePlayingEvent();

        expect(playerStateMock.setBitrateKbps).toHaveBeenCalledWith(4_800);
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

        expect(clientMock.adStart).toHaveBeenCalledTimes(1);
        expect(clientMock.adStart).toHaveBeenCalledWith(0, 'separate', 'content', Conviva.Client.AdPosition.PREROLL);
      });
    });
  });
});
