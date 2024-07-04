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
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker(playerMock, 'test-key');

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.SERVER_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.RESOLUTION, '100x100');
    expect(MockHelper.latestAdAnalytics.reportAdMetric).toHaveBeenCalledWith(Conviva.Constants.Playback.RENDERED_FRAMERATE, 60);
  })

  it('should not report ad resolution and framerate for server side ad', () => {
    const {playerMock} = MockHelper.createPlayerMock();
    const convivaAnalyticsTracker = new ConvivaAnalyticsTracker(playerMock, 'test-key');

    jest.spyOn(playerMock, 'getSource').mockImplementation(() => ({}));

    convivaAnalyticsTracker.initializeSession();

    convivaAnalyticsTracker.trackAdStarted({}, Conviva.Constants.AdType.CLIENT_SIDE);

    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(Conviva.Constants.Playback.RESOLUTION, expect.anything());
    expect(MockHelper.latestAdAnalytics.reportAdMetric).not.toHaveBeenCalledWith(Conviva.Constants.Playback.RENDERED_FRAMERATE, expect.anything());
  })
})
