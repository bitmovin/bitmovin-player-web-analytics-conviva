import { Ad, AdBreak, AdBreakEvent, AdData, AdEvent, ErrorEvent, LinearAd, PlayerAPI, VastAdData } from 'bitmovin-player';
import * as Conviva from '@convivainc/conviva-js-coresdk';
import { INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG, STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG } from '../ConvivaAnalyticsTracker';

export interface SsaiAdInfo {
  /**
   * The ad ID extracted from the ad server that contains the ad creative.
   */
  id: string;
  /**
   * The title of the ad.
   */
  title?: string;
  /**
   * Duration of the ad, in seconds.
   */
  duration?: number;
  /**
   * The name of the ad system (i.e., the ad server).
   */
  adSystem?: string;
  /**
   * The position of the ad.
   */
  position?: Conviva.valueof<Conviva.ConvivaConstants['AdPosition']>;
  /**
   * Indicates whether this ad is a slate or not. Set to <code>true</code> for slate and <code>false</code> for a regular ad.
   */
  isSlate?: boolean;
  /**
   * The name of the ad stitcher.
   */
  adStitcher?: string;
  /**
   * Additional ad metadata. This is a map of key-value pairs that can be used to pass additional metadata about the ad.
   * A list of ad metadata can be found here: <a href="https://pulse.conviva.com/learning-center/content/sensor_developer_center/sensor_integration/javascript/javascript_stream_sensor.htm#IntegrateAdManagers">Conviva documentation</a>
   * <p>
   * Metadata provided here will supersede any data provided in the ad break info.
   */
  additionalMetadata?: Record<string, string>;
}

export class AdHelper {
  public static mapCsaiAdPosition(
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

  public static formatCsaiAdError(event: ErrorEvent & {
    data?: {
      code?: number,
    },
  }) {
    const message = event?.message || 'Unknown message';
    const name = event?.name || 'Unknown name';
    const formattedErrorParts = [
      'Ad error:',
      `${name};`,
      event.data?.code ? `Ad error code: ${event.data?.code};` : undefined,
      `Message:`,
      `${message};`,
      `Error code: ${event.code};`,
      event.troubleShootLink ? `Troubleshoot link: ${event.troubleShootLink}` : undefined,
    ].filter(Boolean);

    return formattedErrorParts.join(' ');
  }

  public static extractCsaiConvivaAdInfo(player: PlayerAPI, adBreakEvent: AdBreakEvent, adEvent: AdEvent): Conviva.ConvivaMetadata {
    const ad = adEvent.ad as Ad | LinearAd;
    const adData = ad.data as undefined | AdData | VastAdData;

    let adSystemName = 'NA';
    let creativeId = 'NA';
    let adTitle = 'NA';
    let firstAdId = ad.id;


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
      'c3.ad.position': AdHelper.mapCsaiAdPosition(adBreakEvent.adBreak, player),
      'c3.ad.system': adSystemName,
      'c3.ad.creativeId': creativeId,
      'c3.ad.firstAdId': firstAdId,
      [Conviva.Constants.ASSET_NAME]: adTitle,
      [Conviva.Constants.STREAM_URL]: ad.mediaFileUrl || 'NA',

      // TODO This is not exposed currently. Add it whenever the player
      // exposes it. Related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801970037469.
      'c3.ad.mediaFileApiFramework': 'NA',

      // TODO these two are not exposed currently. Add them whenever the player
      // exposes them similar to https://github.com/bitmovin-engineering/player-android/pull/3147.
      // Related discussion https://bitmovin.slack.com/archives/C0LJ16JBS/p1716801796326889.
      'c3.ad.firstAdSystem': 'NA',
      'c3.ad.firstCreativeId': 'NA',


      // These are not relevant for the client side (keep in the code for documentation purposes)
      // 'c3.ad.adStitcher': undefined,
      // 'c3.ad.isSlate': undefined,
    };

    if ('duration' in ad && ad.duration) {
      adInfo[Conviva.Constants.DURATION] = ad.duration;
    }

    return adInfo;
  }

  public static convertSsaiAdInfoToConvivaAdInfo(ssaiAdInfo: SsaiAdInfo, allCurrentContentMetadata: Conviva.ConvivaMetadata): Conviva.ConvivaMetadata {
    const keysToPick = [
      INTEGRATION_VERSION_CONTENT_METADATA_CUSTOM_TAG,
      STREAM_TYPE_CONTENT_METADATA_CUSTOM_TAG,
      Conviva.Constants.ASSET_NAME,
      Conviva.Constants.IS_LIVE,
      Conviva.Constants.DEFAULT_RESOURCE,
      Conviva.Constants.ENCODED_FRAMERATE,
      Conviva.Constants.VIEWER_ID,
      Conviva.Constants.PLAYER_NAME,
    ];
    const selectedCurrentContentMetadata: Record<string, string> = {};

    keysToPick.forEach(key => {
      selectedCurrentContentMetadata[key] = allCurrentContentMetadata[key];
    });


    const adInfo: Conviva.ConvivaMetadata = {
      ...selectedCurrentContentMetadata,
      ...ssaiAdInfo.additionalMetadata,
      'c3.ad.id': ssaiAdInfo.id,
      'c3.ad.technology': Conviva.Constants.AdType.SERVER_SIDE,
      'c3.ad.position': ssaiAdInfo.position || 'NA',
      'c3.ad.system': ssaiAdInfo.adSystem || 'NA',
      [Conviva.Constants.ASSET_NAME]: ssaiAdInfo.title || selectedCurrentContentMetadata[Conviva.Constants.ASSET_NAME] || 'NA',
      'c3.ad.adStitcher': ssaiAdInfo.adStitcher || 'NA',
      'c3.ad.isSlate': ssaiAdInfo.isSlate === undefined ? 'NA' : ssaiAdInfo.isSlate.toString(),

      // These are not relevant for the server side (keep in the code for documentation purposes)
      // 'c3.ad.creativeId': undefined,
      // 'c3.ad.firstAdId': undefined,
      // [Conviva.Constants.STREAM_URL]: undefined,
      // 'c3.ad.firstAdSystem': undefined,
      // 'c3.ad.firstCreativeId': undefined,
      // 'c3.ad.mediaFileApiFramework': undefined
    };

    if (ssaiAdInfo.duration) {
      adInfo[Conviva.Constants.DURATION] = ssaiAdInfo.duration;
    }

    return adInfo;
  }
}
