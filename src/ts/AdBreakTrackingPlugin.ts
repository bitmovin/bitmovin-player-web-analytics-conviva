import { AdBreak, LinearAd, PlayerAPI } from 'bitmovin-player';
import { BasicAdTrackingPlugin } from './BasicAdTrackingPlugin';

interface PodAttributes {
  podPosition?: Conviva.Client.AdPosition;
  podIndex?: string;
  podDuration?: string;
  absoluteIndex?: string;
}

// TODO: Description
/**
 *
 */
export class AdBreakTrackingPlugin extends BasicAdTrackingPlugin {
  // Counter variable for adBreaks
  private adBreakCount: number = 0;
  protected currentAdBreakPosition: Conviva.Client.AdPosition;
  protected currentAdBreak: AdBreak;

  private currentPodAttributes: PodAttributes;

  public adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void {
    super.adBreakStarted(adBreak, mappedAdPosition);

    this.adBreakCount++;
    this.currentAdBreakPosition = mappedAdPosition;
    this.currentAdBreak = adBreak;

    // SEND POD END EVENT
    let podAttr: PodAttributes = {};
    // Required
    podAttr.podPosition = mappedAdPosition;
    podAttr.podIndex = String(this.adBreakCount); // Should start with 1 so ++ before

    const adBreakDuration = adBreak.ads.reduce((sum, ad) => sum + (ad.isLinear ? (ad as LinearAd).duration : 0), 0);
    podAttr.podDuration = String(adBreakDuration);

    // Optional
    podAttr.absoluteIndex = String(1); // Always report 1 is sufficient if we can't reliable track it

    this.currentPodAttributes = podAttr;
    this.client.sendCustomEvent(this.contentSessionKey, 'Conviva.PodStart', podAttr);
  }

  public adBreakFinished(): void {
    super.adBreakFinished();

    this.client.sendCustomEvent(this.contentSessionKey, 'Conviva.PodEnd', this.currentPodAttributes);
    this.currentAdBreakPosition = null;
  }
}
