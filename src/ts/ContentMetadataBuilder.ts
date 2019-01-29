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

interface CustomContentMetadata {
  [key: string]: string;
}

export class ContentMetadataBuilder {

  private readonly logger: Conviva.LoggingInterface;
  private readonly contentMetadata: Conviva.ContentMetadata;

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

    this.metadataOverrides = newValue;
  }

  setPlaybackStarted(value: boolean) {
    this.playbackStarted = value;
  }

  build(): Conviva.ContentMetadata {
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

    return this.contentMetadata;
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
      ...this.metadata.custom,
      ...this.metadataOverrides.custom,
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
}
