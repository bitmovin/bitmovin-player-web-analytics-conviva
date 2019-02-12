import { AdBreak, PlayerAPI } from 'bitmovin-player';

export class AdBreakHelper {
  public static mapAdPosition(adBreak: AdBreak, player: PlayerAPI): Conviva.Client.AdPosition {
    if (adBreak.scheduleTime <= 0) {
      return Conviva.Client.AdPosition.PREROLL;
    }

    if (adBreak.scheduleTime >= player.getDuration()) {
      return Conviva.Client.AdPosition.POSTROLL;
    }

    return Conviva.Client.AdPosition.MIDROLL;
  }
}