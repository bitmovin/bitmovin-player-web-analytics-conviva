import { ConvivaAnalyticsTracker, INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG, STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG } from "../../src/ts/ConvivaAnalyticsTracker";
import { ConvivaAnalyticsSsai } from "../../src/ts/ConvivaAnalyticsSsai";
import { mock } from 'jest-mock-extended';
import * as Conviva from '@convivainc/conviva-js-coresdk';
import { ContentMetadataBuilder } from "../../src/ts/ContentMetadataBuilder";

describe(ConvivaAnalyticsSsai, () => {
  it('should report isAdBreakActive as false initially', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    expect(ssai.isAdBreakActive).toBe(false);
  });

  it('should report isAdBreakActive as true after reportAdBreakStarted', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(ssai.isAdBreakActive).toBe(true);
  });

  it('should report isAdBreakActive as false after reset', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reset();

    expect(ssai.isAdBreakActive).toBe(false);
  });

  it('should report ad break started', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledWith(Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should not report ad break started is server side ad is active already', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledTimes(1);
  })

  it('should not report ad break started is client side ad is active already', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: true,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).not.toHaveBeenCalled();
  })

  it('should report ad started', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
      getContentMetadata: () => ({})
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdStarted({
      id: 'adId',
      title: 'adTitle',
      adSystem: 'adSystem',
      adStitcher: 'adStitcher',
      isSlate: false,
      additionalMetadata: {
        customKey: 'customValuie'
      }
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).toHaveBeenCalledWith({
      'c3.ad.id': 'adId',
      'c3.ad.technology': Conviva.Constants.AdType.SERVER_SIDE,
      'c3.ad.position': 'NA',
      'c3.ad.system': 'adSystem',
      [Conviva.Constants.ASSET_NAME]: 'adTitle',
      'c3.ad.adStitcher': 'adStitcher',
      'c3.ad.isSlate': 'false',
      'customKey': 'customValuie',
    }, Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should report ad started with specific data picked from current content metadata', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
      getContentMetadata: () => ({
        [INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG]: '1.0.0',
        [STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG]: 'Stream type from current metadata',
        [Conviva.Constants.ASSET_NAME]: 'Asset name from current metadata',
        [Conviva.Constants.IS_LIVE]: Conviva.Constants.StreamType.LIVE,
        [Conviva.Constants.DEFAULT_RESOURCE]: 'Default resource from current metadata',
        [Conviva.Constants.ENCODED_FRAMERATE]: null,
        [Conviva.Constants.VIEWER_ID]: 'Viewer id from current metadata',
        [Conviva.Constants.PLAYER_NAME]: 'Player name from current metadata',
        // Should not be included in the ad metadata
        customKey: 'Custom value from current metadata'
      })
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdStarted({
      id: 'adId',
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).toHaveBeenCalledWith({
      'c3.ad.id': 'adId',
      'c3.ad.technology': Conviva.Constants.AdType.SERVER_SIDE,
      [INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG]: '1.0.0',
      [STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG]: 'Stream type from current metadata',
      [Conviva.Constants.ASSET_NAME]: 'Asset name from current metadata',
      [Conviva.Constants.IS_LIVE]: Conviva.Constants.StreamType.LIVE,
      [Conviva.Constants.DEFAULT_RESOURCE]: 'Default resource from current metadata',
      [Conviva.Constants.ENCODED_FRAMERATE]: null,
      [Conviva.Constants.VIEWER_ID]: 'Viewer id from current metadata',
      [Conviva.Constants.PLAYER_NAME]: 'Player name from current metadata',
      'c3.ad.isSlate': 'NA',
      'c3.ad.position': 'NA',
      'c3.ad.system': 'NA',
      'c3.ad.adStitcher': 'NA',
    }, Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should prioritize user provided data', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
      getContentMetadata: () => ({
        [Conviva.Constants.ASSET_NAME]: 'Asset name from current metadata',
      })
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdStarted({
      id: 'adId',
      title: 'User provided asset name',
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).toHaveBeenCalledWith(expect.objectContaining({
      [Conviva.Constants.ASSET_NAME]: 'User provided asset name',
    }), Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should not pass custom key from content metadata to ad info', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
      getContentMetadata: () => ({
        // Should not be included in the ad metadata
        customKey: 'Custom value from current metadata'
      })
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdStarted({
      id: 'adId',
      title: 'Test title',
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).toHaveBeenCalledWith(expect.objectContaining({
      [Conviva.Constants.ASSET_NAME]: 'Test title',
    }), Conviva.Constants.AdType.SERVER_SIDE);
  })

  it('should not report ad started if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdStarted({
      id: 'adId',
    });

    expect(convivaAnalyticsTrackerMock.trackAdStarted).not.toHaveBeenCalled();
  })

  it('should report ad finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdFinished();

    expect(convivaAnalyticsTrackerMock.trackAdFinished).toHaveBeenCalled();
  })

  it('should not report ad finished if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdFinished();

    expect(convivaAnalyticsTrackerMock.trackAdFinished).not.toHaveBeenCalled();
  })

  it('should report ad skipped', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdSkipped();

    expect(convivaAnalyticsTrackerMock.trackAdSkipped).toHaveBeenCalled();
  })

  it('should not report ad skipped if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdSkipped();

    expect(convivaAnalyticsTrackerMock.trackAdSkipped).not.toHaveBeenCalled();
  })

  it('should report ad break finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakFinished();

    expect(convivaAnalyticsTrackerMock.trackAdBreakFinished).toHaveBeenCalled();
  })

  it('should not report ad break finished if ad break is not active', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakFinished();

    expect(convivaAnalyticsTrackerMock.trackAdBreakFinished).not.toHaveBeenCalled();
  })

  it('should allow reporting ad break started after the previous ad break has finished', () => {
    const convivaAnalyticsTrackerMock = mock<ConvivaAnalyticsTracker>({
      isAdBreakActive: false,
    });
    const ssai = new ConvivaAnalyticsSsai(convivaAnalyticsTrackerMock);

    ssai.reportAdBreakStarted();
    ssai.reportAdBreakFinished();
    ssai.reportAdBreakStarted();

    expect(convivaAnalyticsTrackerMock.trackAdBreakStarted).toHaveBeenCalledTimes(2);
  })
})
