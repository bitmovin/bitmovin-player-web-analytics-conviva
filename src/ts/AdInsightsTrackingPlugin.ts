import { AdBreakTrackingPlugin } from './AdBreakTrackingPlugin';
import { AdBreak, AdStartedEvent, LinearAd, VastAdData } from 'bitmovin-player';
import { EventAttributes } from './ConvivaAnalytics';

// TODO: Description
export class AdInsightsTrackingPlugin extends AdBreakTrackingPlugin {

  private static UNKNOWN_VALUE = 'NA';

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

    if (!adData) {
      this.logger.consoleLog(
        'For proper adInsights tracking please use player version >= \'8.3.0\'.',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
    }

    // Create a new ContentMetadata object for ad.
    let adMetadata = new Conviva.ContentMetadata();
    adMetadata.assetName = adData && adData.adTitle || AdInsightsTrackingPlugin.UNKNOWN_VALUE;
    adMetadata.streamUrl = ad.mediaFileUrl;
    adMetadata.duration = ad.duration; // Ad Duration In seconds

    const isYospaceUsed = this.player.ads.getModuleInfo().name.includes('yospace');
    const adTechnology = isYospaceUsed ?
      Conviva.Client.AdTechnology.SERVER_SIDE :
      Conviva.Client.AdTechnology.CLIENT_SIDE;

    // custom takes a javascript object as an argument
    adMetadata.custom = {
      // Required
      'c3.ad.technology': String(adTechnology),
      'c3.ad.id': ad.id || AdInsightsTrackingPlugin.UNKNOWN_VALUE,
      'c3.ad.system': adData && adData.adSystem && adData.adSystem.name || AdInsightsTrackingPlugin.UNKNOWN_VALUE,
      'c3.ad.position': String(this.currentAdBreakPosition),
      'c3.ad.type': AdInsightsTrackingPlugin.UNKNOWN_VALUE,
      'c3.ad.mediaFileApiFramework': adData && adData.apiFramework || AdInsightsTrackingPlugin.UNKNOWN_VALUE,
      'c3.ad.adStitcher': isYospaceUsed ? 'Yospace' : AdInsightsTrackingPlugin.UNKNOWN_VALUE,
    };

    const addValueIfPresent = (key: string, value: string) => {
      if (value) {
        adMetadata.custom[key] = value;
      }
    };

    addValueIfPresent('c3.ad.creativeId', adData && adData.creative && adData.creative.adId);
    addValueIfPresent(
      'c3.ad.creativeName',
      adData && adData.creative && adData.creative.universalAdId && adData.creative.universalAdId.value,
    );
    addValueIfPresent('c3.ad.breakId', this.currentAdBreak.id);
    addValueIfPresent('c3.ad.advertiser', adData && adData.advertiser && adData.advertiser.name);
    addValueIfPresent('c3.ad.advertiserId', adData && adData.advertiser && adData.advertiser.id);

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

    this.client.sendCustomEvent(this.adSessionKey, eventName, eventAttributes);
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
