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

    enum ErrorSeverity {
      FATAL,
      WARNING,
    }

    const NO_SESSION_KEY: number;

    const version: string;
  }

  class Client {
    constructor(settings: ClientSettings, systemFactory: SystemFactory);
    adEnd(sessionKey: number): void;
    adStart(sessionKey: number, adStream: Client.AdStream, adPlayer: Client.AdPlayer,
            adPosition: Client.AdPosition): void;
    attachPlayer(sessionKey: number, playerStateManager: PlayerStateManager): void;
    cleanupSession(sessionKey: number): void;
    contentPreload(sessionKey: number): void;
    contentStart(sessionKey: number): void;
    createSession(contentMetadata: ContentMetadata | null): number;
    detachPlayer(sessionKey: number): void;
    getPlayerStateManager(): PlayerStateManager;
    release(): void;
    releasePlayerStateManager(playerStateManager: PlayerStateManager): void;
    reportError(sessionKey: number, errorMessage: string, errorSeverity: Client.ErrorSeverity): void;
    sendCustomEvent(sessionKey: number, eventName: string, eventAttributes: {}): void;
    updateContentMetadata(sessionKey: number, contentMetadata: ContentMetadata): void;
  }

  class ClientSettings {
    constructor(customerKey: string);
    customerKey: string;
    gatewayUrl: string;
    heartbeatInterval: number;
  }

  namespace ContentMetadata {
    enum StreamType {
      UNKNOWN,
      LIVE,
      VOD,
    }
  }

  class ContentMetadata {
    applicationName: string;
    assetName: string;
    custom: {};
    /**
     * @deprecated in at SDK 2.146.0.36444
     */
    defaultBitrateKbps: number;
    defaultResource: string;
    duration: number;
    encodedFrameRate: number;
    streamType: ContentMetadata.StreamType;
    streamUrl: string;
    viewerId: string;
  }

  interface HttpRequestCancelFunction {
    (): void;
  }

  interface HttpRequestCallback {
    (succeeded: boolean, data: string): void;
  }

  interface HttpInterface {
    makeRequest(httpMethod: 'GET' | 'POST', url: string, data: string | null, contentType: string | null,
                timeoutMs: number, callback: HttpRequestCallback | null): HttpRequestCancelFunction;
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
    getBitrateKbps(): number;
    getDuration(): number;
    getEncodedFrameRate(): number;
    getPlayerState(): PlayerStateManager.PlayerState;
    getPlayerType(): string | null;
    getPlayerVersion(): string | null;
    getRenderedFrameRate(): number;
    release(): void;
    reset(): void;
    sendError(errorMessage: string, errorSeverity: Client.ErrorSeverity): void;
    setBitrateKbps(newBitrateKbps: number): void;
    setDuration(duration: number): void;
    setEncodedFrameRate(encodedFrameRate: number): void;
    setPlayerSeekEnd(): void;
    setPlayerSeekStart(seekToPos: number): void;
    setPlayerState(newState: PlayerStateManager.PlayerState): void;
    setPlayerType(playerType: string): void;
    setPlayerVersion(playerVersion: string): void;
    setRenderedFrameRate(renderedFrameRate: number): void;
    setStreamUrl(streamUrl: string): void;
    setUserSeekButtonDown(): void;
    setUserSeekButtonUp(): void;
  }

  interface StorageLoadDataCallback {
    (succeeded: boolean, data: string| null): void;
  }

  interface StorageSaveDataCallback {
    (succeeded: boolean, data: string | null): void;
  }

  interface StorageInterface {
    loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void;
    saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void;
    release(): void;
  }

  class SystemFactory {
    constructor(systemInterface: SystemInterface, systemSettings: SystemSettings);
    release(): void;
  }

  class SystemInterface {
    constructor(timeInterface: TimeInterface, timerInterface: TimerInterface, httpInterface: HttpInterface,
        storageInterface: StorageInterface, metadataInterface: MetadataInterface, loggingInterface: LoggingInterface);
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
    allowUncaughtExceptions: boolean;
    httpTimeout: number;
    logLevel: SystemSettings.LogLevel;
    storageTimeout: number;
  }

  interface TimeInterface {
    getEpochTimeMs(): number;
    release(): void;
  }

  interface TimerAction {
    (): void;
  }

  interface TimerCancelFunction {
    (): void;
  }

  interface TimerInterface {
    createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction;
    release(): void;
  }
}