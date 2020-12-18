export interface Metadata {
  // Can only be set once
  assetName?: string;

  // Can only be set before playback started
  viewerId?: string;
  streamType?: Conviva.ContentMetadata.StreamType;
  applicationName?: string;
  custom?: CustomContentMetadata;
  duration?: number;

  // Dynamic
  encodedFrameRate?: number;
  defaultResource?: string;
  streamUrl?: string;
}

export interface ConvivaMetadata {
  [key: string]: string | number;
}

export interface CustomContentMetadata {
  [key: string]: string;
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

  build(): ConvivaMetadata {
    if (!this.playbackStarted) {
      // Asset name is only allowed to be set once
      if (!this.contentMetadata.assetName) {
        this.contentMetadata.assetName = this.assetName;
      }

      this.contentMetadata.viewerId = this.viewerId;
      this.contentMetadata.streamType = this.metadataOverrides.streamType || this.metadata.streamType;
      this.contentMetadata.applicationName = this.metadataOverrides.applicationName || this.metadata.applicationName;
      this.contentMetadata.duration = this.metadataOverrides.duration || this.metadata.duration;

      this.contentMetadata.custom = this.custom;
    }

    this.contentMetadata.encodedFrameRate = this.metadataOverrides.encodedFrameRate || this.metadata.encodedFrameRate;
    this.contentMetadata.defaultResource = this.metadataOverrides.defaultResource || this.metadata.defaultResource;
    this.contentMetadata.streamUrl = this.metadataOverrides.streamUrl || this.metadata.streamUrl;

    const convivaContentInfo = {} as ConvivaMetadata;
    convivaContentInfo[Conviva.Constants.ASSET_NAME] = this.contentMetadata.assetName;
    convivaContentInfo[Conviva.Constants.ENCODED_FRAMERATE] = this.contentMetadata.encodedFrameRate;
    convivaContentInfo[Conviva.Constants.DURATION] = this.contentMetadata.duration;
    convivaContentInfo[Conviva.Constants.DEFAULT_RESOURCE] = this.contentMetadata.defaultResource;
    convivaContentInfo[Conviva.Constants.STREAM_URL] = this.contentMetadata.streamUrl;
    convivaContentInfo[Conviva.Constants.IS_LIVE] = this.contentMetadata.streamType;
    convivaContentInfo[Conviva.Constants.VIEWER_ID] = this.contentMetadata.viewerId;

    return {...convivaContentInfo, ...this.contentMetadata.custom};
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

  set streamType(newValue: Conviva.ContentMetadata.StreamType) {
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
