type NoStringIndex<T> = { [K in keyof T as string extends K ? never : K]: T[K] };

type ReservedContentMetadata = NoStringIndex<Conviva.ConvivaMetadata>;

export type CustomContentMetadata = { [key: string]: string };

export interface Metadata {
  // Can only be set once
  assetName?: string;

  // Can only be set before playback started
  viewerId?: string;
  streamType?: Conviva.valueof<Conviva.ConvivaConstants['StreamType']>;
  applicationName?: string;
  custom?: CustomContentMetadata;
  duration?: number;

  // Dynamic
  encodedFrameRate?: number;
  defaultResource?: string;
  streamUrl?: string;
  framework?: string;
  frameworkVersion?: string;
}

export class ContentMetadataBuilder {
  private readonly logger: Conviva.LoggingInterface;
  private contentMetadata: Conviva.ContentMetadata;

  // internal metadata fields to enable merging / overriding
  private metadataOverrides: Metadata = {};
  private metadata: Metadata = {};
  private playbackStarted: boolean = false;

  constructor(logger: Conviva.LoggingInterface) {
    this.logger = logger;
    this.contentMetadata = new Conviva.ContentMetadata();
  }

  /**
   * This method is used for custom content metadata updates during / before a session.
   * @param newValue
   */
  setOverrides(newValue: Metadata) {
    if (this.playbackStarted) {
      this.logger.consoleLog(
        '[ Conviva Analytics ] Playback has started. Only some metadata attributes will be updated',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
    }

    this.metadataOverrides = { ...this.metadataOverrides, ...newValue };
  }

  getOverrides(): Metadata {
    return this.metadataOverrides;
  }

  setPlaybackStarted(value: boolean) {
    this.playbackStarted = value;
  }

  build(): Conviva.ConvivaMetadata {
    if (!this.playbackStarted) {
      // Asset name is only allowed to be set once
      if (!this.contentMetadata.assetName) {
        this.contentMetadata.assetName = this.assetName;
      }

      this.contentMetadata.viewerId = this.viewerId;
      this.contentMetadata.streamType = this.metadataOverrides.streamType || this.metadata.streamType;
      this.contentMetadata.applicationName = this.metadataOverrides.applicationName || this.metadata.applicationName;
      this.contentMetadata.duration = this.metadataOverrides.duration || this.metadata.duration;
      this.contentMetadata.framework = this.metadataOverrides.framework || this.metadata.framework;
      this.contentMetadata.frameworkVersion = this.metadataOverrides.frameworkVersion || this.metadata.frameworkVersion;

      this.contentMetadata.custom = this.custom;
    }

    this.contentMetadata.encodedFrameRate = this.metadataOverrides.encodedFrameRate || this.metadata.encodedFrameRate;
    this.contentMetadata.defaultResource = this.metadataOverrides.defaultResource || this.metadata.defaultResource;
    this.contentMetadata.streamUrl = this.metadataOverrides.streamUrl || this.metadata.streamUrl;

    const convivaContentInfo: ReservedContentMetadata = {
      [Conviva.Constants.ASSET_NAME]: this.contentMetadata.assetName,
      [Conviva.Constants.ENCODED_FRAMERATE]: this.contentMetadata.encodedFrameRate,
      [Conviva.Constants.DURATION]: this.contentMetadata.duration,
      [Conviva.Constants.DEFAULT_RESOURCE]: this.contentMetadata.defaultResource,
      [Conviva.Constants.STREAM_URL]: this.contentMetadata.streamUrl,
      [Conviva.Constants.IS_LIVE]: this.contentMetadata.streamType,
      [Conviva.Constants.VIEWER_ID]: this.contentMetadata.viewerId || 'GET_VIEWER_ID_FROM_PLAYER',
      [Conviva.Constants.PLAYER_NAME]: this.contentMetadata.applicationName || 'GET_PLAYER_NAME_OR_TYPE',
    };
    const customContentInfo: CustomContentMetadata = {
      [Conviva.Constants.FRAMEWORK_NAME]: this.contentMetadata.framework,
      [Conviva.Constants.FRAMEWORK_VERSION]: this.contentMetadata.frameworkVersion,
      ...this.contentMetadata.custom,
    };

    return {
      ...convivaContentInfo,
      ...customContentInfo,
    } as Conviva.ConvivaMetadata;
  }

  // These methods should be treated as package private
  set assetName(newValue: string) {
    this.metadata.assetName = newValue;
  }

  get assetName(): string {
    return this.metadataOverrides.assetName || this.metadata.assetName;
  }

  set viewerId(newValue: string) {
    this.metadata.viewerId = newValue;
  }

  get viewerId(): string {
    return this.metadataOverrides.viewerId || this.metadata.viewerId;
  }

  set streamType(newValue: Conviva.valueof<Conviva.ConvivaConstants['StreamType']>) {
    this.metadata.streamType = newValue;
  }

  set applicationName(newValue: string) {
    this.metadata.applicationName = newValue;
  }

  set custom(newValue: CustomContentMetadata) {
    this.metadata.custom = newValue;
  }

  get custom(): CustomContentMetadata {
    return {
      ...this.metadataOverrides.custom,
      ...this.metadata.custom, // Keep our custom tags in case someone tries to override them
    };
  }

  set duration(newValue: number) {
    this.metadata.duration = newValue;
  }

  set encodedFrameRate(newValue: number) {
    this.metadata.encodedFrameRate = newValue;
  }

  set defaultResource(newValue: string) {
    this.metadata.defaultResource = newValue;
  }

  set streamUrl(newValue: string) {
    this.metadata.streamUrl = newValue;
  }

  public reset(): void {
    this.metadataOverrides = {};
    this.metadata = {};
    this.playbackStarted = false;
    this.contentMetadata = new Conviva.ContentMetadata();
  }
}
