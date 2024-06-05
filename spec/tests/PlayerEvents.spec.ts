import { MockHelper, PlayerEventHelper } from '../helper/MockHelper';
import { ConvivaAnalytics } from '../../src/ts';
import * as Conviva from '@convivainc/conviva-js-coresdk';
import { PlayerAPI } from 'bitmovin-player';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});

describe('player event tests', () => {
  let playerMock: PlayerAPI;
  let playerEventHelper: PlayerEventHelper

  beforeEach(() => {
    ({ playerMock, playerEventHelper } = MockHelper.createPlayerMock());

    new ConvivaAnalytics(playerMock, 'TEST-KEY');
  });

  describe('player event handling', () => {
    describe('initialize session', () => {
      it('on play', () => {
        playerEventHelper.firePlayEvent();

        expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenCalledTimes(1);
      });

      it('on error', () => {
        playerEventHelper.fireErrorEvent();

        expect(MockHelper.latestVideoAnalytics.reportPlaybackRequested).toHaveBeenCalledTimes(1);
      });
    });

    describe('update playback state', () => {
      beforeEach(() => {
        playerEventHelper.firePlayEvent();
      });

      it('on playing', () => {
        jest.spyOn(playerMock, 'isPaused').mockReturnValue(false);
        jest.spyOn(playerMock, 'isPlaying').mockReturnValue(true);
        playerEventHelper.firePlayingEvent();

        expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
          Conviva.Constants.Playback.PLAYER_STATE,
          Conviva.Constants.PlayerState.PLAYING,
        );
      });

      it('on pause', () => {
        jest.spyOn(playerMock, 'isPlaying').mockReturnValue(false);
        jest.spyOn(playerMock, 'isPaused').mockReturnValue(true);
        playerEventHelper.firePauseEvent();

        expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
          Conviva.Constants.Playback.PLAYER_STATE,
          Conviva.Constants.PlayerState.PAUSED,
        );
      });
    });
    it('should not crash here', () => {
      jest.spyOn(playerMock, 'isPaused').mockReturnValue(true);
      playerEventHelper.firePauseEvent();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalled();
    });

    describe('v8 stalling handling', () => {
      // In v8 there is no stalling event between play / playing; seek / seeked; timeshift / thimeshifted but it
      // can be treated as stalling so we need to report it (maybe timeout in favor of seeking in buffer)

      describe('reports stalling', () => {
        describe('durring playback', () => {
          beforeEach(() => {
            playerEventHelper.firePlayEvent();
            playerEventHelper.firePlayingEvent();
          });

          it('right after stall started', () => {
            playerEventHelper.fireStallStartedEvent();
          });

          afterEach((done: any) => {
            setTimeout(function () {
              expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenLastCalledWith(
                Conviva.Constants.Playback.PLAYER_STATE,
                Conviva.Constants.PlayerState.BUFFERING,
              );
              done();
            }, 120);
          });
        });
      });

      describe('does not report stalling', () => {
        it('when content is preloaded', (done: any) => {
          playerEventHelper.firePlayEvent();
          setTimeout(() => {
            playerEventHelper.firePlayingEvent();

            expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
              Conviva.Constants.Playback.PLAYER_STATE,
              Conviva.Constants.PlayerState.BUFFERING,
            );
            setTimeout(() => {
              expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
                Conviva.Constants.Playback.PLAYER_STATE,
                Conviva.Constants.PlayerState.BUFFERING,
              );
              done();
            }, 2000);
          }, 30);
        });
      });

      describe('when buffer is ready', () => {
        beforeEach(() => {
          playerEventHelper.firePlayEvent();
          playerEventHelper.firePlayingEvent();
        });

        it('and seeking', (done: any) => {
          playerEventHelper.fireSeekEvent();
          setTimeout(() => {
            playerEventHelper.fireSeekedEvent();

            expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
              Conviva.Constants.Playback.PLAYER_STATE,
              Conviva.Constants.PlayerState.BUFFERING,
            );
            setTimeout(() => {
              expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
                Conviva.Constants.Playback.PLAYER_STATE,
                Conviva.Constants.PlayerState.BUFFERING,
              );
              done();
            }, 2000);
          }, 30);
        });

        it('and time shifting', (done: any) => {
          playerEventHelper.fireTimeShiftEvent();
          setTimeout(() => {
            playerEventHelper.fireTimeShiftedEvent();

            expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
              Conviva.Constants.Playback.PLAYER_STATE,
              Conviva.Constants.PlayerState.BUFFERING,
            );
            setTimeout(() => {
              expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
                Conviva.Constants.Playback.PLAYER_STATE,
                Conviva.Constants.PlayerState.BUFFERING,
              );
              done();
            }, 2000);
          }, 30);
        });
      });
    });

    describe('end session', () => {
      beforeEach(() => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.firePlayingEvent();
      });
      it('on source unloaded', () => {
        playerEventHelper.fireSourceUnloadedEvent();

        expect(MockHelper.latestVideoAnalytics.release).toHaveBeenCalledTimes(1);
      });

      it('on error', () => {
        playerEventHelper.fireErrorEvent();

        expect(MockHelper.latestVideoAnalytics.release).toHaveBeenCalledTimes(1);
      });

      it('playback finished', () => {
        playerEventHelper.firePlaybackFinishedEvent();

        expect(MockHelper.latestVideoAnalytics.release).toHaveBeenCalledTimes(1);
      });
    });

    describe('seeking', () => {
      beforeEach(() => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.firePlayingEvent();
      });

      describe('track seek start', () => {
        it('on seek', () => {
          playerEventHelper.fireSeekEvent(50.145);
          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
            Conviva.Constants.Playback.SEEK_STARTED,
          );
        });

        it('on timeshift', () => {
          playerEventHelper.fireTimeShiftEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
            Conviva.Constants.Playback.SEEK_STARTED,
          );
        });
      });

      describe('track seek end', () => {
        it('on seeked', () => {
          playerEventHelper.fireSeekedEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
            Conviva.Constants.Playback.SEEK_ENDED,
          );
        });

        it('on timeshifted', () => {
          playerEventHelper.fireTimeShiftedEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
            Conviva.Constants.Playback.SEEK_ENDED,
          );
        });
      });
    });
    it('does not track seek if play never happened', () => {
      playerEventHelper.fireSeekEvent();
      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalled();
    });
  });

  describe('ad tracking', () => {
    beforeEach(() => {
      jest.spyOn(playerMock, 'getDuration').mockReturnValue(10);
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
    });

    it('track pre-roll ad', () => {
      playerEventHelper.fireAdBreakStartedEvent(0);
      playerEventHelper.fireAdStartedEvent();
      expect(MockHelper.latestVideoAnalytics.reportAdBreakStarted).toHaveBeenCalledTimes(1);
      expect(MockHelper.latestVideoAnalytics.reportAdBreakStarted).toHaveBeenCalledWith(
        Conviva.Constants.AdType.CLIENT_SIDE,
        Conviva.Constants.AdPlayer.SEPARATE,
      );
    });

    it('track  mid-roll ad', () => {
      playerEventHelper.fireAdBreakStartedEvent(5);
      playerEventHelper.fireAdStartedEvent();
      expect(MockHelper.latestVideoAnalytics.reportAdBreakStarted).toHaveBeenCalledTimes(1);
      expect(MockHelper.latestVideoAnalytics.reportAdBreakStarted).toHaveBeenCalledWith(
        Conviva.Constants.AdType.CLIENT_SIDE,
        Conviva.Constants.AdPlayer.SEPARATE,
      );
    });

    describe('track ad end', () => {
      beforeEach(() => {
        playerEventHelper.fireAdBreakStartedEvent(0);
        playerEventHelper.fireAdStartedEvent();
      });

      it('on adError', () => {
        playerEventHelper.fireAdErrorEvent();
        playerEventHelper.fireAdBreakFinishedEvent();
        expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      });

      it('on ad skipped', () => {
        playerEventHelper.fireAdSkippedEvent();
        playerEventHelper.fireAdBreakFinishedEvent();
        expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      });

      it('on ad end', () => {
        playerEventHelper.fireAdBreakFinishedEvent();
        expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('bitrate tracking', () => {
    it('report bitrate on event', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireVideoPlaybackQualityChangedEvent(2_400_000);

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.BITRATE,
        2_400,
      );
    });

    describe('event order workaround', () => {
      it('track current bitrate on session initialization', () => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.fireVideoPlaybackQualityChangedEvent(4_800_000);
        playerEventHelper.firePlayingEvent();

        expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
          Conviva.Constants.Playback.BITRATE,
          4_800,
        );
      });
    });
  });

  describe('ad event workarounds', () => {
    describe('event order in case of pre-roll ad', () => {
      it('track pre-roll ad', () => {
        playerEventHelper.firePlayEvent();
        playerEventHelper.fireAdBreakStartedEvent(0);
        playerEventHelper.firePlayingEvent();
        playerEventHelper.fireAdStartedEvent();

        expect(MockHelper.latestVideoAnalytics.reportAdBreakStarted).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('track audio changed', () => {
    it('on audio changed', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireAudioChanged();

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.AUDIO_LANGUAGE,
        '[es]:Spanish',
      );
    });
  });

  describe('track subtitle enabled', () => {
    it('on subtitle enabled', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireSubtitleEnabled('subtitles');

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.SUBTITLES_LANGUAGE,
        '[en]:English',
      );
    });
  });

  describe('track subtitle disabled', () => {
    it('on subtitle disabled', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireSubtitleDisabled('subtitles');

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.SUBTITLES_LANGUAGE,
        'off',
      );
    });
  });

  describe('track closed captions enabled', () => {
    it('on closed captions enabled', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireSubtitleEnabled('captions');

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE,
        '[en]:English',
      );
    });
  });

  describe('track closed captions disabled', () => {
    it('on closed captions disabled', () => {
      playerEventHelper.firePlayEvent();
      playerEventHelper.firePlayingEvent();
      playerEventHelper.fireSubtitleDisabled('captions');

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE,
        'off',
      );
    });
  });
});
