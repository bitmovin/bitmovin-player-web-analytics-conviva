///<reference path="Conviva.d.ts"/>
import {Html5Time} from './Html5Time';
import {Html5Timer} from './Html5Timer';
import {Html5Http} from './Html5Http';
import {Html5Storage} from './Html5Storage';
import {Html5Metadata} from './Html5Metadata';
import {Html5Logging} from './Html5Logging';

export declare type Player = any; // TODO use player API type definitions once available

export interface ConvivaAnalyticsConfiguration {
  /**
   * The TOUCHSTONE_SERVICE_URL for testing with Touchstone. Only to be used for development, must not be set in
   * production or automated testing.
   */
  gatewayUrl?: string;
  /**
   * A string value used to distinguish individual apps, players, locations, platforms, and/or deployments.
   */
  applicationName?: string;
  /**
   * A unique identifier to distinguish individual viewers/subscribers and their watching experience through
   * Conviva's Viewers Module in Pulse.
   * Can also be set in the source config of the player, which will take precedence over this value.
   */
  viewerId?: string;
}

export interface EventAttributes {
  [key: string]: string;
}

export class ConvivaAnalytics {

  private player: Player;
  private config: ConvivaAnalyticsConfiguration;

  private systemFactory: Conviva.SystemFactory;
  private client: Conviva.Client;
  private playerStateManager: Conviva.PlayerStateManager;

  private logger: Conviva.LoggingInterface;
  private sessionKey: number;

  constructor(player: Player, customerKey: string, config: ConvivaAnalyticsConfiguration = {}) {
    if (typeof Conviva === 'undefined') {
      console.error('Conviva script missing, cannot init ConvivaAnalytics. '
        + 'Please load the Conviva script (conviva-core-sdk.min.js) before Bitmovin\'s ConvivaAnalytics integration.');
      return; // Cancel initialization
    }

    this.player = player;
    this.config = config;

    this.logger = new Html5Logging();
    this.sessionKey = Conviva.Client.NO_SESSION_KEY;

    let systemInterface = new Conviva.SystemInterface(
      new Html5Time(),
      new Html5Timer(),
      new Html5Http(),
      new Html5Storage(),
      new Html5Metadata(),
      this.logger
    );

    let systemSettings = new Conviva.SystemSettings();
    this.systemFactory = new Conviva.SystemFactory(systemInterface, systemSettings);

    let clientSettings = new Conviva.ClientSettings(customerKey);

    if (config.gatewayUrl) {
      clientSettings.gatewayUrl = config.gatewayUrl;
    }

    this.client = new Conviva.Client(clientSettings, this.systemFactory);

    this.playerStateManager = this.client.getPlayerStateManager();

    // The video stream is stalled and waiting for more video data.
    //this.playerStateManager.setPlayerState(Conviva.PlayerStateManager.PlayerState.BUFFERING);

    // We are now streaming at a bitrate of 2.2Mbps.
    //this.playerStateManager.setBitrateKbps(2200); // in Kbps

    // There was an error with video playback, and the video player reported an error code of 'INVALID_MANIFEST'.
    // Due to the severity of the error, this will most likely prevent playback and should be considered as fatal.
    //this.playerStateManager.sendError('INVALID_MANIFEST', Conviva.Client.ErrorSeverity.FATAL);

    // Duration of the video stream was detected. It is 30000 milliseconds.
    //this.playerStateManager.setDuration(30); // in seconds

    // Encoded frame rate of the video stream was detected. It is 29 frames per second.
    //this.playerStateManager.setEncodedFrameRate(29);

    // The name of the video player was not available until an instance of it was created.
    // We now know it is 'AdvancedVideoPlayer'.
    this.playerStateManager.setPlayerType('Bitmovin Player');

    // The version of the video player was not available until an instance of it was created.
    // We now know it is '1.2.3.4'.
    this.playerStateManager.setPlayerVersion(player.version);

    this.registerPlayerEvents();

    if(player.isReady()) {
      // We already have a source loaded and can directly start a session
      this.startSession();
    }
  }

  private startSession = () => {
    let source = this.player.getConfig().source;

    // Create a ContentMetadata object and supply relevant metadata for the requested content.
    let contentMetadata = new Conviva.ContentMetadata();
    contentMetadata.assetName = source.title || 'Untitled (no source.title set)';
    contentMetadata.viewerId = source.viewerId || this.config.viewerId || null;
    contentMetadata.applicationName = this.config.applicationName || 'Unknown (no config.applicationName set)';
    contentMetadata.duration = this.player.getDuration(); // TODO how to handle HLS Chrome deferred duration detection?
    contentMetadata.streamType = this.player.isLive() ? Conviva.ContentMetadata.StreamType.LIVE // TODO how to handle HLS deferred live detection?
        : Conviva.ContentMetadata.StreamType.VOD;
    // TODO set streamUrl

    // Create a Conviva monitoring session.
    this.sessionKey = this.client.createSession(contentMetadata);

    if (this.sessionKey === Conviva.Client.NO_SESSION_KEY) {
      // Something went wrong. With stable system interfaces, this should never happen.
      this.logger.consoleLog('Something went wrong, could not obtain session key',
        Conviva.SystemSettings.LogLevel.ERROR);
    }

    // sessionKey was obtained as shown above
    this.client.attachPlayer(this.sessionKey, this.playerStateManager);
  };

  private reportVideoQualityChange = (event: any) => {
    this.playerStateManager.setBitrateKbps(event.targetQuality.bitrate);
  };

  private endSession = () => {
    // sessionKey was obtained as shown above
    this.client.detachPlayer(this.sessionKey);

    // Terminate the existing Conviva monitoring session represented by sessionKey
    this.client.cleanupSession(this.sessionKey);
  };

  private registerPlayerEvents(): void {
    let player = this.player;
    player.addEventHandler(player.EVENT.ON_READY, this.startSession);
    player.addEventHandler(player.EVENT.ON_VIDEO_PLAYBACK_QUALITY_CHANGED, this.reportVideoQualityChange);
    player.addEventHandler(player.EVENT.ON_SOURCE_UNLOADED, this.endSession);
  }

  /**
   * Sends a custom application-level event to Conviva's Player Insight. An application-level event can always
   * be sent and is not tied to a specific video.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomApplicationEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    this.client.sendCustomEvent(Conviva.Client.NO_SESSION_KEY, eventName, eventAttributes);
  }

  /**
   * Sends a custom playback-level event to Conviva's Player Insight. A playback-level event can only be sent
   * during an active video session.
   * @param eventName arbitrary event name
   * @param eventAttributes a string-to-string dictionary object with arbitrary attribute keys and values
   */
  sendCustomPlaybackEvent(eventName: string, eventAttributes: EventAttributes = {}): void {
    // Check for active session
    if (this.sessionKey == Conviva.Client.NO_SESSION_KEY) {
      this.logger.consoleLog('cannot send playback event, no active monitoring session',
        Conviva.SystemSettings.LogLevel.WARNING);
      return;
    }

    this.client.sendCustomEvent(this.sessionKey, eventName, eventAttributes);
  }

  release(): void {
    this.client.releasePlayerStateManager(this.playerStateManager);
    this.client.release();
    this.systemFactory.release();
  }
}