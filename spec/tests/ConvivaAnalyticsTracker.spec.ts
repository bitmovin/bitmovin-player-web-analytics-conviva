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
      PlayerEvent.AdBreakFinished,
    ])('should clear timer for stalling when reported player event is %s', (event) => {
      const stallTrackingStopTimeoutSpy = jest.spyOn(convivaAnalyticsTracker['stallTrackingTimeout'], 'clear');

      convivaAnalyticsTracker.trackPlaybackStateChanged({ type: event } as PlayerEventBase);

      expect(stallTrackingStopTimeoutSpy).toHaveBeenCalled();
    })
  })

  /**
   * Since the web player dispatches AdBreakFinished only after main content has successfully restored,
   * a workaround is in place to signal the end of the ad break early so that VST can properly be tracked.
   */
  describe('eager ad break ended signalling', () => {
    let convivaAnalyticsTracker: ConvivaAnalyticsTracker;
    let reportAdBreakEndedSpy: jest.SpyInstance;
    let reportAdBreakStartedSpy: jest.SpyInstance;

    beforeEach(() => {
      convivaAnalyticsTracker = new ConvivaAnalyticsTracker('test-key');

      const {playerMock} = MockHelper.createPlayerMock();
      convivaAnalyticsTracker.attachPlayer(playerMock);
      jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({ title: 'test-title' }));
      convivaAnalyticsTracker.initializeSession();
      
      jest.useFakeTimers();
      reportAdBreakEndedSpy = jest.spyOn(convivaAnalyticsTracker['convivaVideoAnalytics'], 'reportAdBreakEnded');
      reportAdBreakStartedSpy = jest.spyOn(convivaAnalyticsTracker['convivaVideoAnalytics'], 'reportAdBreakStarted');
    });

    it('should report ad break ended on AdBreakFinished by default', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdFinished();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(0);

      convivaAnalyticsTracker.trackAdBreakFinished();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(1);
    })

    it('should report ad break ended early if AdBreakFinished is too slow', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdFinished();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(0);

      jest.runAllTimers();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(1);
    })

    it('should not report ad break ended if AdFinished is followed by a new AdStarted', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdFinished();

      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);

      jest.runAllTimers();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(0);
      expect(reportAdBreakStartedSpy).toHaveBeenCalledTimes(1);
    })

    it('should report ad break started again after wrongly reporting ad break ended', () => {
      convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);
      convivaAnalyticsTracker.trackAdFinished();
      jest.runAllTimers();

      expect(reportAdBreakEndedSpy).toHaveBeenCalledTimes(1);
      expect(reportAdBreakStartedSpy).toHaveBeenCalledTimes(1);

      convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);

      expect(reportAdBreakStartedSpy).toHaveBeenCalledTimes(2);
    })
  });
})

const getInvokedTimes = (mock: unknown) => {
  return (mock as jest.MockInstance<Function, unknown[]>).mock.calls.length;
}
