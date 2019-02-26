import { AdBreakTrackingPlugin } from './AdBreakTrackingPlugin';
import { AdBreak, AdStartedEvent, LinearAd, VastAdData } from 'bitmovin-player';
import { EventAttributes } from './ConvivaAnalytics';

// TODO: Description
export class AdInsightsTrackingPlugin extends AdBreakTrackingPlugin {

  private static UNKNOWN_VALUE_KEY = 'NA';

  private adSessionKey: number = Conviva.Client.NO_SESSION_KEY;
  private adPlayerStateManager: Conviva.PlayerStateManager;

  public adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void {
    super.adBreakStarted(adBreak, mappedAdPosition);
  }

  public adBreakFinished(): void {
    super.adBreakFinished();
  }

  public adStarted(event: AdStartedEvent): void {
    if (!event.ad.isLinear) {
      return;
    }

    const adData = event.data as VastAdData;
    const ad = event.ad as LinearAd;

    // Create a new ContentMetadata object for ad.
    let adMetadata = new Conviva.ContentMetadata();
    adMetadata.assetName = adData.adTitle || AdInsightsTrackingPlugin.UNKNOWN_VALUE_KEY;
    adMetadata.streamUrl = ad.mediaFileUrl;
    adMetadata.duration = ad.duration; // Ad Duration In seconds

    // custom takes a javascript object as an argument
    adMetadata.custom = {
      // Required
      'c3.ad.technology': AdInsightsTrackingPlugin.UNKNOWN_VALUE_KEY, // TODO: support server side in case of yospace
      'c3.ad.id': ad.id,
      'c3.ad.system': adData && adData.adSystem && adData.adSystem.name,
      'c3.ad.position': this.currentAdBreakPosition,
      'c3.ad.type': AdInsightsTrackingPlugin.UNKNOWN_VALUE_KEY,
      'c3.ad.mediaFileApiFramework': adData && adData.apiFramework,
      'c3.ad.adStitcher': AdInsightsTrackingPlugin.UNKNOWN_VALUE_KEY, // TODO: find a way to export that from the yospace integration

      // Optional
      'c3.ad.creativeId': adData && adData.creative && adData.creative.adId,
      'c3.ad.creativeName': adData && adData.creative && adData.creative.universalAdId && adData.creative.universalAdId.value,
      'c3.ad.breakId': this.currentAdBreak.id,
      'c3.ad.advertiser': adData && adData.advertiser && adData.advertiser.name,
      'c3.ad.advertiserId': adData && adData.advertiser && adData.advertiser.id,
    };

    this.adSessionKey = this.client.createAdSession(this.contentSessionKey, adMetadata);
    this.adPlayerStateManager = this.client.getPlayerStateManager();

    // Client object is obtained from the main video content
    this.client.attachPlayer(this.adSessionKey, this.adPlayerStateManager);

    this.adPlayerStateManager.setPlayerState(Conviva.PlayerStateManager.PlayerState.PLAYING);
  }

  public adFinished(): void {
    this.endAdSession();
  }

  public reportPlayerState(state: Conviva.PlayerStateManager.PlayerState): void {
    super.reportPlayerState(state);
    this.adPlayerStateManager.setPlayerState(state);
  }

  public reportCustomEvent(eventName: string, eventAttributes: EventAttributes): void {
    if (!this.isAdSessionActive()) {
      return;
    }

    this.client.sendCustomEvent(this.adSessionKey, event.type, eventAttributes);
  }

  public isAdSessionActive(): boolean {
    return this.adSessionKey !== Conviva.Client.NO_SESSION_KEY;
  }

  private endAdSession() {
    this.adPlayerStateManager.reset();
    this.client.detachPlayer(this.adSessionKey);
    this.client.cleanupSession(this.adSessionKey);
    this.adSessionKey = Conviva.Client.NO_SESSION_KEY;
  }
}
