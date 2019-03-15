import { AdBreak, AdEvent, PlayerAPI } from 'bitmovin-player';
import { EventAttributes } from './ConvivaAnalytics';

export abstract class AdTrackingPlugin {
  protected client: Conviva.Client;
  protected contentSessionKey: number;
  protected logger: Conviva.LoggingInterface;
  protected player: PlayerAPI;

  constructor(player: PlayerAPI, client: Conviva.Client, sessionKey: number, logger: Conviva.LoggingInterface) {
    this.client = client;
    this.contentSessionKey = sessionKey;
    this.logger = logger;
    this.player = player;
  }

  // Return if there is a separate ad session is active to distinguish to which session a event should be reported
  public isAdSessionActive(): boolean {
    return false;
  }

  public abstract adBreakStarted(adBreak: AdBreak, mappedAdPosition: Conviva.Client.AdPosition): void;
  public abstract adBreakFinished(): void;
  public adStarted(event: AdEvent): void { }
  public adFinished(): void { }
  public reportPlayerState(state: Conviva.PlayerStateManager.PlayerState): void { }
  public reportCustomEvent(eventName: string, eventAttributes: EventAttributes): void { }
}
