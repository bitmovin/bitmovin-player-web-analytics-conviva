import { PlayerEvent, PlayerEventBase } from "bitmovin-player";
import { ConvivaAnalyticsTracker } from "../../src/ts/ConvivaAnalyticsTracker";
import { MockHelper } from "../helper/MockHelper";
import * as Conviva from '@convivainc/conviva-js-coresdk';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe(ConvivaAnalyticsTracker, () => {
  it('should report ad resolution and framerate for server side ad', () => {
    const {playerMock} = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.SERVER_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.RESOLUTION, '100x100');
    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.RENDERED_FRAMERATE, 60);
  })

  it('should not report ad resolution and framerate for client side ad', () => {
    const {playerMock} = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(Conviva.Constants.Playback.RESOLUTION, expect.anything());
    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(Conviva.Constants.Playback.RENDERED_FRAMERATE, expect.anything());
  })

  it('should report audio track on the first play', () => {
    const {playerMock, playerEventHelper} = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.AUDIO_LANGUAGE, expect.anything());
  })

  it('should report subtitles on the first play', () => {
    const {playerMock, playerEventHelper} = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.CLOSED_CAPTIONS_LANGUAGE, expect.anything());
  })

  it('should not report playback metrics after the first play', () => {
    const {playerMock, playerEventHelper} = MockHelper.createPlayerMock();

    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');
    convivaAnalyticsTracker.attachPlayer(playerMock);

    playerEventHelper.firePlayEvent();
    const invokedTimesBefore = getInvokedTimes(MockHelper.latestVideoAnalytics.reportPlaybackMetric);

    playerEventHelper.firePlayEvent();
    const invokedTimesAfter = getInvokedTimes(MockHelper.latestVideoAnalytics.reportPlaybackMetric);

    expect(invokedTimesAfter).toBe(invokedTimesBefore);
  })

  it('should report ad break ended on RestoringContent event', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');

    convivaAnalyticsTracker.attachPlayer(playerMock);
    playerEventHelper.firePlayEvent();
    convivaAnalyticsTracker.trackRestoringContent();

    expect(MockHelper.latestVideoAnalytics.reportAdBreakEnded).toHaveBeenCalledTimes(1);
  });

  it('should not report the player state on AdBreakFinished events if there is still an active ad', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');

    convivaAnalyticsTracker.attachPlayer(playerMock);
    playerEventHelper.fireAdBreakFinishedEvent();
    convivaAnalyticsTracker.trackAdBreakFinished();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).not.toHaveBeenCalled();
  });

  it('should report the player state on AdBreakFinished events if there is no active ad', () => {
    const { playerMock, playerEventHelper } = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');

    convivaAnalyticsTracker.attachPlayer(playerMock);
    playerEventHelper.firePlayEvent();
    convivaAnalyticsTracker.trackRestoringContent();
    convivaAnalyticsTracker.trackAdBreakFinished();

    expect(MockHelper.latestVideoAnalytics.reportPlaybackMetric).toHaveBeenCalled();
  });

  describe('trackPlaybackStateChanged', () => {
    let convivaAnalyticsTracker: ConvivaAnalyticsTracker;

    beforeEach(() => {
      convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');

      const {playerMock} = MockHelper.createPlayerMock();
      convivaAnalyticsTracker.attachPlayer(playerMock);
      jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({ title: 'test-title' }));
      convivaAnalyticsTracker.initializeSession();
    })

    test.each([
      PlayerEvent.Play,
      PlayerEvent.Seek,
      PlayerEvent.TimeShift,
      PlayerEvent.AdBreakStarted,
      PlayerEvent.AdFinished,
    ])('should start timer for stalling when reported player event is %s', (event) => {
      const stallTrackingStartTimeoutSpy = jest.spyOn(convivaAnalyticsTracker['stallTrackingTimeout'], 'start');

      convivaAnalyticsTracker.trackPlaybackStateChanged({ type: event } as PlayerEventBase);

      expect(stallTrackingStartTimeoutSpy).toHaveBeenCalled();
    })

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
      const stallTrackingStopTimeoutSpy = jest.spyOn(convivaAnalyticsTracker['stallTrackingTimeout'], 'clear');

      convivaAnalyticsTracker.trackPlaybackStateChanged({ type: event } as PlayerEventBase);

      expect(stallTrackingStopTimeoutSpy).toHaveBeenCalled();
    })
  })
})

const getInvokedTimes = (mock: unknown) => {
  return (mock as jest.MockInstance<Function, unknown[]>).mock.calls.length;
}
