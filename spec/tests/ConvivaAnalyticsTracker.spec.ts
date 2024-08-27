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
})

const getInvokedTimes = (mock: unknown) => {
  return (mock as jest.MockInstance<Function, unknown[]>).mock.calls.length;
}
