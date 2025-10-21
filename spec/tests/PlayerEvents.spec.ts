import { MockHelper, PlayerEventHelper } from '../helper/MockHelper';
import { ConvivaAnalytics } from '../../src/ts';
import * as Conviva from '@convivainc/conviva-js-coresdk';
import { AdEvent, PlayerAPI } from 'bitmovin-player';
import { ConvivaAnalyticsTracker } from '../../src/ts/ConvivaAnalyticsTracker';
import { PlayerEvent } from '../helper/PlayerEvent';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});

const PlayerState = Conviva.Constants.PlayerState;
const PLAYER_STATE = Conviva.Constants.Playback.PLAYER_STATE;

describe('player event tests', () => {
  let playerMock: PlayerAPI;
  let playerEventHelper: PlayerEventHelper;
  let convivaAnalytics: ConvivaAnalytics;

  beforeEach(() => {
    ({ playerMock, playerEventHelper } = MockHelper.createPlayerMock());

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');
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

      test.each`
        event                       | isAdActive | expectedPlayerState
        ${PlayerEvent.Playing}      | ${false}   | ${PlayerState.PLAYING}
        ${PlayerEvent.Playing}      | ${true}    | ${PlayerState.PLAYING}
        ${PlayerEvent.Paused}       | ${false}   | ${PlayerState.PAUSED}
        ${PlayerEvent.Paused}       | ${true}    | ${PlayerState.PAUSED}
        ${PlayerEvent.StallStarted} | ${false}   | ${PlayerState.BUFFERING}
        ${PlayerEvent.StallStarted} | ${true}    | ${PlayerState.BUFFERING}
        ${PlayerEvent.StallEnded}   | ${false}   | ${PlayerState.PLAYING}
        ${PlayerEvent.StallEnded}   | ${true}    | ${PlayerState.PLAYING}
        ${PlayerEvent.Seeked}       | ${false}   | ${PlayerState.PLAYING}
        ${PlayerEvent.Seeked}       | ${true}    | ${PlayerState.PLAYING}
        ${PlayerEvent.TimeShifted}  | ${false}   | ${PlayerState.PLAYING}
        ${PlayerEvent.TimeShifted}  | ${true}    | ${PlayerState.PLAYING}
      `(
        'should report player state $expectedPlayerState on ad metric $isAdActive after event $event',
        ({ event, isAdActive, expectedPlayerState }) => {
          jest.spyOn(playerMock, 'isPlaying').mockReturnValue(expectedPlayerState === PlayerState.PLAYING);
          jest.spyOn(playerMock, 'isPaused').mockReturnValue(expectedPlayerState === PlayerState.PAUSED);

          const reportAdMetricSpy = jest.spyOn(MockHelper.latestAdAnalytics, 'reportAdMetric');
          const reportPlaybackMetricSpy = jest.spyOn(MockHelper.latestVideoAnalytics, 'reportPlaybackMetric');
          const mockAdData: AdEvent = { ad: { id: 'test-ad-id', data: {} } } as AdEvent;

          if (isAdActive) {
            convivaAnalytics['convivaAnalyticsTracker'].trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
          }
          playerEventHelper.fireEvent({ time: 0, timestamp: Date.now(), type: event, ...mockAdData });

          if (isAdActive) {
            expect(reportAdMetricSpy).toHaveBeenLastCalledWith(PLAYER_STATE, expectedPlayerState);
            expect(reportPlaybackMetricSpy).not.toHaveBeenLastCalledWith(PLAYER_STATE, expectedPlayerState);
          } else {
            expect(reportAdMetricSpy).not.toHaveBeenLastCalledWith(PLAYER_STATE, expectedPlayerState);
            expect(reportPlaybackMetricSpy).toHaveBeenLastCalledWith(PLAYER_STATE, expectedPlayerState);
          }
        },
      );

      test.each`
        event                           | isAdActive | expectedAdMetric         | expectedPlaybackMetric
        ${PlayerEvent.AdBreakStarted}   | ${false}   | ${PlayerState.BUFFERING} | ${undefined}
        ${PlayerEvent.AdBreakStarted}   | ${true}    | ${PlayerState.BUFFERING} | ${undefined}
        ${PlayerEvent.AdStarted}        | ${false}   | ${undefined}             | ${undefined}
        ${PlayerEvent.AdStarted}        | ${true}    | ${PlayerState.PLAYING}   | ${undefined}
        ${PlayerEvent.AdError}          | ${false}   | ${undefined}             | ${undefined}
        ${PlayerEvent.AdError}          | ${true}    | ${undefined}             | ${undefined}
        ${PlayerEvent.AdSkipped}        | ${false}   | ${undefined}             | ${undefined}
        ${PlayerEvent.AdSkipped}        | ${true}    | ${undefined}             | ${undefined}
        ${PlayerEvent.AdFinished}       | ${false}   | ${undefined}             | ${undefined}
        ${PlayerEvent.AdFinished}       | ${true}    | ${PlayerState.BUFFERING} | ${undefined}
        ${PlayerEvent.RestoringContent} | ${false}   | ${undefined}             | ${PlayerState.BUFFERING}
        ${PlayerEvent.RestoringContent} | ${true}    | ${undefined}             | ${PlayerState.BUFFERING}
        ${PlayerEvent.AdBreakFinished}  | ${false}   | ${undefined}             | ${PlayerState.PLAYING}
        ${PlayerEvent.AdBreakFinished}  | ${true}    | ${undefined}             | ${undefined}
      `(
        'should report ad metric $expectedAdMetric and playback metric $expectedPlaybackMetric on event $event when ad is active $isAdActive',
        ({ event, isAdActive, expectedAdMetric, expectedPlaybackMetric }) => {
          jest
            .spyOn(playerMock, 'isPlaying')
            .mockReturnValue(
              expectedPlaybackMetric === PlayerState.PLAYING || expectedAdMetric === PlayerState.PLAYING,
            );

          const reportAdMetricSpy = jest.spyOn(MockHelper.latestAdAnalytics, 'reportAdMetric');
          const reportPlaybackMetricSpy = jest.spyOn(MockHelper.latestVideoAnalytics, 'reportPlaybackMetric');
          const mockAdData: AdEvent = { ad: { id: 'test-ad-id', data: {} } } as AdEvent;

          if (isAdActive) {
            if (event === PlayerEvent.AdStarted || event === PlayerEvent.AdFinished) {
              // Needs ad break initialization
              playerEventHelper.fireAdBreakStartedEvent(0);
            } else {
              // Just track the active ad break state
              convivaAnalytics['convivaAnalyticsTracker'].trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
            }
          }
          playerEventHelper.fireEvent({ time: 0, timestamp: Date.now(), type: event, ...mockAdData });

          if (expectedAdMetric) {
            expect(reportAdMetricSpy).toHaveBeenLastCalledWith(PLAYER_STATE, expectedAdMetric);
          } else {
            expect(reportAdMetricSpy).not.toHaveBeenLastCalledWith(PLAYER_STATE, expect.anything());
          }

          if (expectedPlaybackMetric) {
            expect(reportPlaybackMetricSpy).toHaveBeenLastCalledWith(PLAYER_STATE, expectedPlaybackMetric);
          } else {
            expect(reportPlaybackMetricSpy).not.toHaveBeenLastCalledWith(PLAYER_STATE, expect.anything());
          }
        },
      );
    });

    describe('delayed stalling reporting', () => {
      // In v8 there is no stalling event between play / playing; seek / seeked; timeshift / thimeshifted but it
      // can be treated as stalling so we need to report it (maybe timeout in favor of seeking in buffer)

      describe('reports stalling', () => {
        describe('during playback', () => {
          beforeEach(() => {
            playerEventHelper.firePlayEvent();
            playerEventHelper.firePlayingEvent();
          });

          it('right after stall started', () => {
            playerEventHelper.fireStallStartedEvent();
          });

          afterEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS * 1.5));

            expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenLastCalledWith(
              Conviva.Constants.Playback.PLAYER_STATE,
              Conviva.Constants.PlayerState.BUFFERING,
            );
          });
        });
      });

      describe('does not report stalling', () => {
        it('when content is preloaded', async () => {
          playerEventHelper.firePlayEvent();

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS / 2));

          playerEventHelper.firePlayingEvent();

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS * 1.5));

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );
        });
      });

      describe('when buffer is ready', () => {
        beforeEach(() => {
          playerEventHelper.firePlayEvent();
          playerEventHelper.firePlayingEvent();
        });

        it('and seeking', async () => {
          playerEventHelper.fireSeekEvent();

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS / 2));

          playerEventHelper.fireSeekedEvent();

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS * 1.5));

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );
        });

        it('and time shifting', async () => {
          playerEventHelper.fireTimeShiftEvent();

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS / 2));

          playerEventHelper.fireTimeShiftedEvent();

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );

          await new Promise((resolve) => setTimeout(resolve, ConvivaAnalyticsTracker.STALL_TRACKING_DELAY_MS * 1.5));

          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
            Conviva.Constants.Playback.PLAYER_STATE,
            Conviva.Constants.PlayerState.BUFFERING,
          );
        });
      });

      describe('stallTrackingTimeout', () => {
        test.each([PlayerEvent.Play, PlayerEvent.Seek, PlayerEvent.TimeShift])(
          'should start timer for stalling when reported player event is %s',
          (event) => {
            const stallTrackingStartTimeoutSpy = jest.spyOn(
              convivaAnalytics['convivaAnalyticsTracker'],
              'startStallTrackingTimeout',
            );

            playerEventHelper.fireEvent({ time: 0, timestamp: Date.now(), type: event });

            expect(stallTrackingStartTimeoutSpy).toHaveBeenCalled();
          },
        );

        test.each([
          PlayerEvent.StallStarted,
          PlayerEvent.Playing,
          PlayerEvent.Paused,
          PlayerEvent.Seeked,
          PlayerEvent.TimeShifted,
          PlayerEvent.StallEnded,
          PlayerEvent.PlaybackFinished,
          PlayerEvent.AdStarted,
        ])('should clear timer for stalling when reported player event is %s', (event) => {
          const stallTrackingStopTimeoutSpy = jest.spyOn(
            convivaAnalytics['convivaAnalyticsTracker'],
            'clearStallTrackingTimeout',
          );

          playerEventHelper.fireEvent({ time: 0, timestamp: Date.now(), type: event });

          expect(stallTrackingStopTimeoutSpy).toHaveBeenCalled();
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
            expect.any(Number),
          );
        });

        it('on timeshift', () => {
          playerEventHelper.fireTimeShiftEvent();
          expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
            Conviva.Constants.Playback.SEEK_STARTED,
            -1,
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

    it('track mid-roll ad', () => {
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
        playerEventHelper.fireRestoringContentEvent();
        playerEventHelper.fireAdBreakFinishedEvent();
        expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      });

      it('on ad skipped', () => {
        playerEventHelper.fireAdSkippedEvent();
        playerEventHelper.fireRestoringContentEvent();
        playerEventHelper.fireAdBreakFinishedEvent();
        expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      });

      it('on ad end', () => {
        playerEventHelper.fireRestoringContentEvent();
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
