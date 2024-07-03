import { PlayerAPI } from 'bitmovin-player';
import { BrowserUtils } from './BrowserUtils';

export class PlayerConfigHelper {
  /**
   * The config for autoplay and preload have great impact to the VST (Video Startup Time) we track it.
   * Since there is no way to get default config values from the player they are hardcoded.
   */
  public static AUTOPLAY_DEFAULT_CONFIG: boolean = false;

  /**
   * Extract autoplay config form player
   *
   * @param player: Player
   */
  public static getAutoplayConfig(player: PlayerAPI): boolean {
    const playerConfig = player.getConfig();

    if (playerConfig.playback && playerConfig.playback.autoplay !== undefined) {
      return playerConfig.playback.autoplay;
    } else {
      return PlayerConfigHelper.AUTOPLAY_DEFAULT_CONFIG;
    }
  }

  /**
   * Extract preload config from player
   *
   * The preload config can be set individual for mobile or desktop as well as on root level for both platforms.
   * Default value is true for VOD and false for live streams. If the value is not set for current platform or on root
   * level the default value will be used over the value for the other platform.
   *
   * @param player: Player
   */
  public static getPreloadConfig(player: PlayerAPI): boolean {
    const playerConfig = player.getConfig();

    if (BrowserUtils.isMobile()) {
      if (
        playerConfig.adaptation &&
        playerConfig.adaptation.mobile &&
        playerConfig.adaptation.mobile.preload !== undefined
      ) {
        return playerConfig.adaptation.mobile.preload;
      }
    } else {
      if (
        playerConfig.adaptation &&
        playerConfig.adaptation.desktop &&
        playerConfig.adaptation.desktop.preload !== undefined
      ) {
        return playerConfig.adaptation.desktop.preload;
      }
    }

    if (playerConfig.adaptation && playerConfig.adaptation.preload !== undefined) {
      return playerConfig.adaptation.preload;
    }

    return !player.isLive();
  }
}
