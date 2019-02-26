import { AdBreak, LinearAd, PlayerAPI } from 'bitmovin-player';
import { BasicAdTrackingPlugin } from './BasicAdTrackingPlugin';

// TODO: Description
/**
 *
 */
export class AdBreakTrackingPlugin extends BasicAdTrackingPlugin {
  // Counter variable for adBreaks
  private adBreakCount: number = 0;
  protected currentAdBreakPosition: Conviva.Client.AdPosition;
  protected currentAdBreak: AdBreak;

  public adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void {
    super.adBreakStarted(adBreak, mappedAdPosition);

    this.adBreakCount++;
    this.currentAdBreakPosition = mappedAdPosition;
    this.currentAdBreak = adBreak;

    // SEND POD END EVENT
    let podAttr: any = {};
    // Required
    podAttr.podPosition = mappedAdPosition;
    podAttr.podIndex = String(this.adBreakCount); // Should start with 1 so ++ before
    podAttr.podDuration = adBreak.ads.map((ad) => ad.isLinear ? (ad as LinearAd).duration : 0);

    // Optional
    podAttr.absoluteIndex = String(1); // Always report 1 is sufficient if we can't reliable track it

    this.client.sendCustomEvent(this.contentSessionKey, 'Conviva.PodStart', podAttr);
  }

  public adBreakFinished(): void {
    super.adBreakFinished();

    // SEND POD END EVENT
    let podAttr: any = {};
    // Required
    podAttr.podPosition = this.currentAdBreakPosition;
    podAttr.podIndex = String(this.adBreakCount);
    podAttr.podDuration = this.currentAdBreak.ads.map((ad) => ad.isLinear ? (ad as LinearAd).duration : 0);

    // Optional
    podAttr.absoluteIndex = String(1); // Always report 1 is sufficient if we can't reliable track it

    this.client.sendCustomEvent(this.contentSessionKey, 'Conviva.PodEnd', podAttr);
    this.currentAdBreakPosition = null;
  }
}
