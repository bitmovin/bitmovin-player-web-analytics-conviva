import { PlayerAPI, PlayerEvent, PlayerEventBase } from 'bitmovin-player';
import * as Conviva from '@convivainc/conviva-js-coresdk';

export class PlayerStateHelper {
  public static getPlayerStateFromEvent(event: PlayerEventBase, events: typeof PlayerEvent, player: PlayerAPI) {
    let playerState;

    switch (event.type) {
      case events.StallStarted:
        playerState = Conviva.Constants.PlayerState.BUFFERING;
        break;
      case events.Playing:
        playerState = Conviva.Constants.PlayerState.PLAYING;
        break;
      case events.Paused:
        playerState = Conviva.Constants.PlayerState.PAUSED;
        break;
      case events.Seeked:
      case events.TimeShifted:
      case events.StallEnded:
        if (player.isPlaying()) {
          playerState = Conviva.Constants.PlayerState.PLAYING;
        } else {
          playerState = Conviva.Constants.PlayerState.PAUSED;
        }
        break;
    }

    return playerState;
  }

  public static getPlayerState(player: PlayerAPI): Conviva.valueof<Conviva.ConvivaConstants["PlayerState"]> {
    if (player.isStalled()) {
      return Conviva.Constants.PlayerState.BUFFERING;
    }

    if (player.isPlaying()) {
      return Conviva.Constants.PlayerState.PLAYING;
    }

    return Conviva.Constants.PlayerState.PAUSED;
  }
}
