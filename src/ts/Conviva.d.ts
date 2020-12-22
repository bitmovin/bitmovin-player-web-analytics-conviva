declare namespace Conviva {

  namespace Constants {
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

    enum CallbackFunctions {
      CONSOLE_LOG,
      MAKE_REQUEST,
      SAVE_DATA,
      LOAD_DATA,
      CREATE_TIMER,
      GET_EPOCH_TIME_IN_MS,
    }

    enum Playback {
      BITRATE,
      BUFFER_LENGTH,
      CDN_IP,
      PLAYER_STATE,
      PLAY_HEAD_TIME,
      RENDERED_FRAMERATE,
      RESOLUTION,
      SEEK_ENDED,
      SEEK_STARTED,
    }

    enum Network {
      CONNECTION_TYPE,
      LINK_ENCRYPTION,
      SIGNAL_STRENGTH,
    }

    enum PlayerState {
      STOPPED,
      PLAYING,
      BUFFERING,
      PAUSED,
      UNKNOWN,
      NOT_MONITORED,
    }

    const NO_SESSION_KEY: number;

    const version: string;

    const GATEWAY_URL: string;

    const LOG_LEVEL: string;

    const ASSET_NAME: string;

    const PLAYER_NAME: string;

    const ENCODED_FRAMERATE: string;

    const DURATION: string;

    const DEFAULT_RESOURCE: string;

    const STREAM_URL: string;

    const IS_LIVE: string;

    const VIEWER_ID: string;

    const FRAMEWORK_NAME: string;

    const FRAMEWORK_VERSION: string;

    enum LogLevel {
      DEBUG,
      INFO,
      WARNING,
      ERROR,
      NONE,
    }

    enum StreamType {
      UNKNOWN,
      LIVE,
      VOD,
    }

    enum AdType {
      CLIENT_SIDE,
      SERVER_SIDE,
    }

    enum DeviceMetadata {
      BRAND,
      CATEGORY,
      MANUFACTURER,
      MODEL,
      OS_NAME,
      OS_VERSION,
      TYPE,
      VERSION,
    }
  }

  class Analytics {
    public static init(customerKey: string, callbackFunctions: any, settings?: {[key: string]: string| number}): void;
    public static buildVideoAnalytics(): Conviva.ConvivaVideoAnalytics;
    public static setDeviceMetadata(metadata: {[key: string]: Conviva.Constants.DeviceCategory}): Conviva.Constants.DeviceCategory;
    public static release(): void;
  }

  interface ConvivaVideoAnalytics {
    reportPlaybackRequested(contentInfo?: {[key: string]: number | string}): void;

    reportPlaybackFailed(errorMessage: string, contentInfo?: {[key: string]: number | string}): void;

    reportPlaybackEnded(): void;

    setContentInfo(contentInfo: {[key: string]: number | string}): void;

    setPlayerInfo(playerInfo: {[key: string]: number | string}): void;

    reportPlaybackMetric(event: Conviva.Constants.Playback | Conviva.Constants.PlayerState, value?: string | number): void;

    reportDeviceMetric(metric: Conviva.Constants.Network, value?: string | number): void;

    reportAdBreakStarted(adType: Conviva.Constants.AdType, adPlayer: Conviva.Constants.AdPlayer, position?: Conviva.Constants.AdPosition): void;

    reportAdBreakEnded(): void;

    setCallback(callback: Function): void;

    getSessionId(): number;

    release(): void;
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
    public custom: {};
    public defaultResource: string;
    public duration: number;
    public encodedFrameRate: number;
    public streamType: ContentMetadata.StreamType;
    public streamUrl: string;
    public viewerId: string;
    public frameworkVersion: string;
    public framework: string;
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

    getDeviceType(): Constants.DeviceType;

    getDeviceVersion(): string | null;

    getFrameworkName(): string | null;

    getFrameworkVersion(): string | null;

    getOperatingSystemName(): string | null;

    getOperatingSystemVersion(): string | null;

    getDeviceCategory(): Constants.DeviceCategory | null;

    release(): void;
  }

  type StorageLoadDataCallback = (succeeded: boolean, data: string | null) => void;

  type StorageSaveDataCallback = (succeeded: boolean, data: string | null) => void;

  interface StorageInterface {
    loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void;

    saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void;

    release(): void;
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
