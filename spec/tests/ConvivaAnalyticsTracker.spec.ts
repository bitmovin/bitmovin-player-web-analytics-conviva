import { PlayerEvent, PlayerEventBase } from 'bitmovin-player';
import { ConvivaAnalyticsTracker } from '../../src/ts/ConvivaAnalyticsTracker';
import { MockHelper } from '../helper/MockHelper';
import * as Conviva from '@convivainc/conviva-js-coresdk';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe(ConvivaAnalyticsTracker, () => {
  it('should report ad resolution and framerate for server side ad', () => {
    const { playerMock } = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.SERVER_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(
      Conviva.Constants.Playback.RESOLUTION,
      '100x100',
    );
    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(
      Conviva.Constants.Playback.RENDERED_FRAMERATE,
      60,
    );
  });

  it('should not report ad resolution and framerate for client side ad', () => {
    const { playerMock } = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(
      Conviva.Constants.Playback.RESOLUTION,
      expect.anything(),
    );
    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(
      Conviva.Constants.Playback.RENDERED_FRAMERATE,
      expect.anything(),
    );
  });

  it('should report audio track on the first play', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
      Conviva.Constants.Playback.AUDIO_LANGUAGE,
      expect.anything(),
    );
  });

  it('should report subtitles on the first play', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
      Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE,
      expect.anything(),
    );
  });

  it('should not report playback metrics after the first play', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();
    const invokedTimesBefore = getInvokedTimes(MockHelper.latestVideoAnalytics.reportPlaybackMetric);

    playerEventHelper.firePlayEvent();
    const invokedTimesAfter = getInvokedTimes(MockHelper.latestVideoAnalytics.reportPlaybackMetric);

    expect(invokedTimesAfter).toBe(invokedTimesBefore);
  });

  describe('CSAI', () => {
    let convivaAnalyticsTracker: ConvivaAnalyticsTracker;

    beforeEach(() => {
      const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();
      convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
      convivaAnalyticsTracker.attachPlayer(playerMock);
      playerEventHelper.firePlayEvent();
      jest.spyOn(playerMock, 'isPlaying').mockReturnValue(true);
    });

    it('should not report ad break ended on AdBreakFinished if there is still an active ad', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdBreakFinished(Conviva.Constants.AdType.CLIENT_SIDE);

      expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(0);
      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalledWith(
        Conviva.Constants.Playback.PLAYER_STATE,
        Conviva.Constants.PlayerState.PLAYING,
      );
    });

    it('should report ad break ended if AdBreakFinished is preceeded by RestoringContent event', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackRestoringContent();
      convivaAnalyticsTracker.trackAdBreakFinished(Conviva.Constants.AdType.CLIENT_SIDE);

      expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.PLAYER_STATE,
        Conviva.Constants.PlayerState.PLAYING,
      );
    });

    it('should not report ad break ended multiple times', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackRestoringContent();
      convivaAnalyticsTracker.trackRestoringContent();
      convivaAnalyticsTracker.trackRestoringContent();

      expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
    });
  });

  describe('SSAI', () => {
    let convivaAnalyticsTracker: ConvivaAnalyticsTracker;

    beforeEach(() => {
      const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();
      convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
      convivaAnalyticsTracker.attachPlayer(playerMock);
      playerEventHelper.firePlayEvent();
      jest.spyOn(playerMock, 'isPlaying').mockReturnValue(true);
    });

    it('should report the player state on AdBreakFinished when there is an active ad', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.SERVER_SIDE);
      convivaAnalyticsTracker.trackAdBreakFinished(Conviva.Constants.AdType.SERVER_SIDE);

      expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(
        Conviva.Constants.Playback.PLAYER_STATE,
        Conviva.Constants.PlayerState.PLAYING,
      );
    });
  });
});

const getInvokedTimes = (mock: unknown) => {
  return (mock as jest.MockInstance<Function, unknown[]>).mock.calls.length;
};
