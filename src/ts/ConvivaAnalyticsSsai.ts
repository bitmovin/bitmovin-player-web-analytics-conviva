import * as Conviva from '@convivainc/conviva-js-coresdk';
import { ConvivaAnalyticsTracker, INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG } from './ConvivaAnalyticsTracker';
import { AdHelper, SsaiAdInfo } from './helper/AdHelper';

export class ConvivaAnalyticsSsai {
  private readonly convivaAnalyticsTracker: ConvivaAnalyticsTracker;

  constructor(convivaAnalyticsTracker: ConvivaAnalyticsTracker) {
    this.convivaAnalyticsTracker = convivaAnalyticsTracker;
  }

  private _isAdBreakActive: boolean = false;

  /**
   * Reports if a server-side ad break is currently active.
   *
   * @return <code>true</code> if a server-side ad break is active, <code>false</code> otherwise.
   */
  public get isAdBreakActive() {
    return this._isAdBreakActive;
  }

  public reset() {
    this._isAdBreakActive = false;
  }

  /**
   * Reports the start of a server-side ad break. Must be called before the first ad starts.
   * Has no effect if a server-side ad break is already playing.
   */
  public reportAdBreakStarted() {
    if (this.convivaAnalyticsTracker.isAdBreakActive || this._isAdBreakActive) {
        return;
    }

    this._isAdBreakActive = true;
    this.convivaAnalyticsTracker.trackAdBreakStarted(Conviva.Constants.AdType.SERVER_SIDE);
  }

  /**
   * Reports the start of a server-side ad.
   * <p>
   * Has to be called after calling the <code>reportAdBreakStarted</code> method.
   *
   * @param serverSideAdInfo Object containing metadata about the server-side ad.
   */
  public reportAdStarted(serverSideAdInfo: SsaiAdInfo) {
    if (!this._isAdBreakActive) {
        return;
    }

    this.convivaAnalyticsTracker.trackAdStarted(
      AdHelper.convertSsaiAdInfoToConvivaAdInfo(serverSideAdInfo, this.convivaAnalyticsTracker.getContentMetadata()),
      Conviva.Constants.AdType.SERVER_SIDE,
    );
  }

  /**
   * Reports the end of a server-side ad.
   * Has no effect if no server-side ad is currently playing.
   */
  public reportAdFinished() {
    if (!this.isAdBreakActive) {
        return;
    }

    this.convivaAnalyticsTracker.trackAdFinished();
  }

  /**
   * Reports that the current ad was skipped.
   * Has no effect if no server-side ad is playing.
   */
  public reportAdSkipped() {
    if (!this._isAdBreakActive) {
        return;
    }

    this.convivaAnalyticsTracker.trackAdSkipped();
  }

  /**
   * Reports the end of a server-side ad break. Must be called after the last ad has finished.
   * Has no effect if no server-side ad break is currently active.
   */
  public reportAdBreakFinished() {
    if (!this._isAdBreakActive) {
        return;
    }

    this._isAdBreakActive = false;
    this.convivaAnalyticsTracker.trackAdBreakFinished();
  }
}
