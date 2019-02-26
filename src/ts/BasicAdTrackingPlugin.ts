import { AdBreak } from 'bitmovin-player';
import { AdTrackingPlugin } from './AdTrackingPlugin';

export class BasicAdTrackingPlugin extends AdTrackingPlugin {
  public adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void {
    this.client.adStart(
      this.contentSessionKey,
      Conviva.Client.AdStream.SEPARATE,
      Conviva.Client.AdPlayer.CONTENT,
      mappedAdPosition,
    );
  }

  public adBreakFinished(): void {
    this.client.adEnd(this.contentSessionKey);
  }
}
