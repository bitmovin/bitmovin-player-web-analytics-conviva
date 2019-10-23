declare namespace Conviva {

  namespace Client {
    enum AdPlayer {
      CONTENT,
      SEPARATE,
    }

    enum AdPosition {
      PREROLL,
      MIDROLL,
      POSTROLL,
    }

    enum AdStream {
      CONTENT,
      SEPARATE,
    }

    enum DeviceType {
      DESKTOP,
      CONSOLE,
      SETTOP,
      MOBILE,
      TABLET,
      SMARTTV,
      UNKNOWN,
    }

    enum DeviceCategory {
      ANDROID_DEVICE,
      APPLE_DEVICE,
      CHROMECAST,
      DESKTOP_APP,
      DEVICE_SIMULATOR,
      LG_TV,
      NINTENDO,
      PLAYSTATION,
      ROKU,
      SAMSUNG_TV,
      SET_TOP_BOX,
      SMART_TV,
      TIVO,
      WEB,
      WINDOWS_DEVICE,
      XBOX,
    }

    enum ErrorSeverity {
      FATAL,
      WARNING,
    }

    enum AdTechnology {
      CLIENT_SIDE,
      SERVER_SIDE,
    }

    const NO_SESSION_KEY: number;

    const version: string;
  }

  class Client {
    constructor(settings: ClientSettings, systemFactory: SystemFactory);

    public adEnd(sessionKey: number): void;

    public adStart(
      sessionKey: number,
      adStream: Client.AdStream,
      adPlayer: Client.AdPlayer,
      adPosition: Client.AdPosition,
    ): void;

    public attachPlayer(sessionKey: number, playerStateManager: PlayerStateManager): void;

    public cleanupSession(sessionKey: number): void;

    public contentPreload(sessionKey: number): void;

    public contentStart(sessionKey: number): void;

    public createSession(contentMetadata: ContentMetadata | null): number;

    public detachPlayer(sessionKey: number): void;

    public getPlayerStateManager(): PlayerStateManager;

    public release(): void;

    public releasePlayerStateManager(playerStateManager: PlayerStateManager): void;

    public reportError(sessionKey: number, errorMessage: string, errorSeverity: Client.ErrorSeverity): void;

    public sendCustomEvent(sessionKey: number, eventName: string, eventAttributes: {}): void;

    public updateContentMetadata(sessionKey: number, contentMetadata: ContentMetadata): void;

    public createAdSession(contentSessionKey: number, adMetadata: ContentMetadata): number;
  }

  class ClientSettings {
    public customerKey: string;
    public gatewayUrl: string;
    public heartbeatInterval: number;

    constructor(customerKey: string);
  }

  namespace ContentMetadata {
    enum StreamType {
      UNKNOWN,
      LIVE,
      VOD,
    }
  }

  class ContentMetadata {
    public applicationName: string;
    public assetName: string;
    public custom: { [key: string]: string };
    public defaultResource: string;
    public duration: number;
    public encodedFrameRate: number;
    public streamType: ContentMetadata.StreamType;
    public streamUrl: string;
    public viewerId: string;
  }

  type HttpRequestCancelFunction = () => void;

  type HttpRequestCallback = (succeeded: boolean, data: string) => void;

  interface HttpInterface {
    makeRequest(
      httpMethod: 'GET' | 'POST',
      url: string,
      data: string | null,
      contentType: string | null,
      timeoutMs: number,
      callback: HttpRequestCallback | null,
    ): HttpRequestCancelFunction;

    release(): void;
  }

  interface LoggingInterface {
    consoleLog(message: string, logLevel: SystemSettings.LogLevel): void;

    release(): void;
  }

  interface MetadataInterface {
    getBrowserName(): string | null;

    getBrowserVersion(): string | null;

    getDeviceBrand(): string | null;

    getDeviceManufacturer(): string | null;

    getDeviceModel(): string | null;

    getDeviceType(): Client.DeviceType;

    getDeviceVersion(): string | null;

    getFrameworkName(): string | null;

    getFrameworkVersion(): string | null;

    getOperatingSystemName(): string | null;

    getOperatingSystemVersion(): string | null;

    getDeviceCategory(): Conviva.Client.DeviceCategory | null;

    release(): void;
  }

  namespace PlayerStateManager {
    enum PlayerState {
      STOPPED,
      PLAYING,
      BUFFERING,
      PAUSED,
      UNKNOWN,
      NOT_MONITORED,
    }
  }

  class PlayerStateManager {
    public getBitrateKbps(): number;

    public getDuration(): number;

    public getEncodedFrameRate(): number;

    public getPlayerState(): PlayerStateManager.PlayerState;

    public getPlayerType(): string | null;

    public getPlayerVersion(): string | null;

    public getRenderedFrameRate(): number;

    public release(): void;

    public reset(): void;

    public sendError(errorMessage: string, errorSeverity: Client.ErrorSeverity): void;

    public setBitrateKbps(newBitrateKbps: number): void;

    public setDuration(duration: number): void;

    public setEncodedFrameRate(encodedFrameRate: number): void;

    public setPlayerSeekEnd(): void;

    public setPlayerSeekStart(seekToPos: number): void;

    public setPlayerState(newState: PlayerStateManager.PlayerState): void;

    public setPlayerType(playerType: string): void;

    public setPlayerVersion(playerVersion: string): void;

    public setRenderedFrameRate(renderedFrameRate: number): void;

    public setStreamUrl(streamUrl: string): void;

    public setUserSeekButtonDown(): void;

    public setUserSeekButtonUp(): void;
  }

  type StorageLoadDataCallback = (succeeded: boolean, data: string | null) => void;

  type StorageSaveDataCallback = (succeeded: boolean, data: string | null) => void;

  interface StorageInterface {
    loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void;

    saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void;

    release(): void;
  }

  class SystemFactory {
    constructor(systemInterface: SystemInterface, systemSettings: SystemSettings);

    public release(): void;
  }

  class SystemInterface {
    constructor(
      timeInterface: TimeInterface,
      timerInterface: TimerInterface,
      httpInterface: HttpInterface,
      storageInterface: StorageInterface,
      metadataInterface: MetadataInterface,
      loggingInterface: LoggingInterface,
    );
  }

  namespace SystemSettings {
    enum LogLevel {
      DEBUG,
      INFO,
      WARNING,
      ERROR,
      NONE,
    }
  }

  class SystemSettings {
    public allowUncaughtExceptions: boolean;
    public httpTimeout: number;
    public logLevel: SystemSettings.LogLevel;
    public storageTimeout: number;
  }

  interface TimeInterface {
    getEpochTimeMs(): number;

    release(): void;
  }

  type TimerAction = () => void;

  type TimerCancelFunction = () => void;

  interface TimerInterface {
    createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction;

    release(): void;
  }
}
