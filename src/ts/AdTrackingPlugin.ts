import { AdBreak, AdClickedEvent, AdEvent, AdStartedEvent, PlayerEventBase } from 'bitmovin-player';
import { EventAttributes } from './ConvivaAnalytics';

export abstract class AdTrackingPlugin {
  protected client: Conviva.Client;
  protected contentSessionKey: number;

  constructor(client: Conviva.Client, sessionKey: number) {
    this.client = client;
    this.contentSessionKey = sessionKey;
  }

  // Return if there is a separate ad session is active to distinguish to which session a event should be reporte
  public isAdSessionActive(): boolean {
    return false;
  }

  public abstract adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void;
  public abstract adBreakFinished(): void;
  public adStarted(event: AdStartedEvent): void { }
  public adFinished(): void { }
  public reportPlayerState(state: Conviva.PlayerStateManager.PlayerState): void { }
  public reportCustomEvent(eventName: string, eventAttributes: EventAttributes): void { }
}

export class BasicAdTrackingPlugin extends AdTrackingPlugin {
  adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void {
    this.client.adStart(
      this.contentSessionKey,
      Conviva.Client.AdStream.SEPARATE,
      Conviva.Client.AdPlayer.CONTENT,
      mappedAdPosition,
    );
  }

  adBreakFinished(): void {
    this.client.adEnd(this.contentSessionKey);
  }
}
