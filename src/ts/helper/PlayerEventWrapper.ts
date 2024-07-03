import { PlayerAPI, PlayerEvent, PlayerEventBase } from 'bitmovin-player';
import { ArrayUtils } from 'bitmovin-player-ui/dist/js/framework/arrayutils';

export class PlayerEventWrapper {
  private player: PlayerAPI;
  private readonly eventHandlers: { [eventType: string]: Array<(event?: PlayerEventBase) => void> };

  constructor(player: PlayerAPI) {
    this.player = player;
    this.eventHandlers = {};
  }

  public add(eventType: PlayerEvent, callback: (event?: PlayerEventBase) => void): void {
    this.player.on(eventType, callback);

    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType].push(callback);
  }

  public remove(eventType: PlayerEvent, callback: (event?: PlayerEventBase) => void): void {
    this.player.off(eventType, callback);

    if (this.eventHandlers[eventType]) {
      ArrayUtils.remove(this.eventHandlers[eventType], callback);
    }
  }

  public clear(): void {
    for (const eventType in this.eventHandlers) {
      for (const callback of this.eventHandlers[eventType]) {
        this.remove(eventType as PlayerEvent, callback);
      }
    }
  }
}
