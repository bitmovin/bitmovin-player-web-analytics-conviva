import { AdBreak, PlayerAPI } from 'bitmovin-player';

export class AdBreakHelper {
  public static mapAdPosition(
    adBreak: AdBreak,
    player: PlayerAPI,
  ): Conviva.valueof<Conviva.ConvivaConstants['AdPosition']> {
    if (adBreak.scheduleTime <= 0) {
      return Conviva.Constants.AdPosition.PREROLL;
    }

    if (adBreak.scheduleTime >= player.getDuration()) {
      return Conviva.Constants.AdPosition.POSTROLL;
    }

    return Conviva.Constants.AdPosition.MIDROLL;
  }
}
