import { ConvivaAnalyticsTracker } from "../../src/ts/ConvivaAnalyticsTracker";
import { ConvivaSsaiAnalytics } from "../../src/ts/ConvivaSsaiAnalytics";
import { mock } from 'jest-mock-extended';
import * as Conviva from '@convivainc/conviva-js-coresdk';

describe(ConvivaSsaiAnalytics, () => {
  it('should report isAdBreakActive as false initially', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    expect(ssai.isAdBreakActive).toBe(false);
  });

  it('should report isAdBreakActive as true after reportAdBreakStarted', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(ssai.isAdBreakActive).toBe(true);
  });

  it('should report isAdBreakActive as false after reset', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reset();

    expect(ssai.isAdBreakActive).toBe(false);
  });

  it('should report ad break started', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledWith(Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should not report ad break started is server side ad is active already', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledTimes(1);
  })

  it('should not report ad break started is client side ad is active already', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: true,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).not.toHaveBeenCalled();
  })

  it('should report ad started', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdStarted({
      id: 'adId',
      title: 'adTitle',
      adSystem: 'adSystem',
      adStitcher: 'adStitcher',
      isSlate: false,
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).toHaveBeenCalledWith({
      'c3.ad.id': 'adId',
      'c3.ad.technology': Conviva.Constants.AdType.SERVER_SIDE,
      'c3.ad.position': 'NA',
      'c3.ad.system': 'adSystem',
      [Conviva.Constants.ASSET_NAME]: 'adTitle',
      'c3.ad.adStitcher': 'adStitcher',
      'c3.ad.isSlate': 'false',
    });
  })

  it('should not report ad started if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdStarted({
      id: 'adId',
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).not.toHaveBeenCalled();
  })

  it('should report ad finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdFinished();

    expect(convivaAnalyticsTrackerMock.trackAdFinished).toHaveBeenCalled();
  })

  it('should not report ad finished if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdFinished();

    expect(convivaAnalyticsTrackerMock.trackAdFinished).not.toHaveBeenCalled();
  })

  it('should report ad skipped', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdSkipped();

    expect(convivaAnalyticsTrackerMock.trackAdSkipped).toHaveBeenCalled();
  })

  it('should not report ad skipped if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdSkipped();

    expect(convivaAnalyticsTrackerMock.trackAdSkipped).not.toHaveBeenCalled();
  })

  it('should report ad break finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakFinished();

    expect(convivaAnalyticsTrackerMock.trackAdBreakFinished).toHaveBeenCalled();
  })

  it('should not report ad break finished if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakFinished();

    expect(convivaAnalyticsTrackerMock.trackAdBreakFinished).not.toHaveBeenCalled();
  })

  it('should allow reporting ad break started after the previous ad break has finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaSsaiAnalytics(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakFinished();
    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledTimes(2);
  })
})
