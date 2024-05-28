import { Ad, AdBreak, AdBreakEvent, AdData, AdEvent, ErrorEvent, LinearAd, PlayerAPI, VastAdData } from 'bitmovin-player';
import * as Conviva from '@convivainc/conviva-js-coresdk';

export class AdHelper {
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

  public static formatAdErrorEvent(event: ErrorEvent & {
    message?: string,
    troubleShootLink?: string,
    data?: {
      code?: number,
    },
  }) {
    const message = event?.message || 'Unknown message';
    const name = event?.name || 'Unknown name';
    const formattedErrorParts = [
      `${name}:`,
      `${message};`,
      `Error code: ${event.code};`,
      event.data?.code ? `Ad error code: ${event.data?.code};` : undefined,
      event.troubleShootLink ? `Troubleshoot link: ${event.troubleShootLink}` : undefined,
    ].filter(Boolean);

    return formattedErrorParts.join(' ');
  }

  public static extractConvivaAdInfo(player: PlayerAPI, adBreakEvent: AdBreakEvent, adEvent: AdEvent): Conviva.ConvivaMetadata {
    const adPosition = AdHelper.mapAdPosition(adBreakEvent.adBreak, player);
    const ad = adEvent.ad as Ad | LinearAd;
    const adData = ad.data as undefined | AdData | VastAdData;

    let adSystemName = 'NA';
    let creativeId = 'NA';
    let adTitle: string | undefined;
    let firstAdId = ad.id;

    // TODO these two are not exposed currently. Add them whenever the player
    // exposes them similar to https://github.com/bitmovin-engineering/player-android/pull/3147.
    // Related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801796326889.
    let firstAdSystem = 'NA';
    let firstCreativeId = 'NA';

    // TODO This is not exposed currently. Add it whenever the player
    // exposes it. Related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801970037469.
    let mediaFileApiFramework = 'NA';

    if (adData) {
      if ('adSystem' in adData && adData.adSystem?.name) {
        adSystemName = adData.adSystem.name;
      }

      if ('creative' in adData && adData?.creative?.id) {
        creativeId = adData.creative.id;
      }

      if ('adTitle' in adData && adData.adTitle) {
        adTitle = adData.adTitle;
      }

      if ('wrapperAdIds' in adData && adData.wrapperAdIds && adData.wrapperAdIds.length) {
        firstAdId = adData.wrapperAdIds[adData.wrapperAdIds.length - 1];
      }
    }

    const adInfo: Conviva.ConvivaMetadata = {
      'c3.ad.id': ad.id,
      'c3.ad.technology': Conviva.Constants.AdType.CLIENT_SIDE,
      'c3.ad.position': adPosition,
      'c3.ad.system': adSystemName,
      'c3.ad.creativeId': creativeId,
      'c3.ad.firstAdId': firstAdId,
      'c3.ad.mediaFileApiFramework': mediaFileApiFramework,
      'c3.ad.firstAdSystem': firstAdSystem,
      'c3.ad.firstCreativeId': firstCreativeId,

      // These two are not relevant for the client side (keep in the code for documentation purposes)
      // 'c3.ad.adStitcher': undefined,
      // 'c3.ad.isSlate': undefined,
    };

    if (adTitle) {
      adInfo[Conviva.Constants.ASSET_NAME] = adTitle;
    }

    if (ad.mediaFileUrl) {
      adInfo[Conviva.Constants.STREAM_URL] = ad.mediaFileUrl;
    }

    if ('duration' in ad && ad.duration) {
      adInfo[Conviva.Constants.DURATION] = ad.duration;
    }

    return adInfo;
  }
}
