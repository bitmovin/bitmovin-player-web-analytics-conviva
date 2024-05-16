import * as Conviva from '@convivainc/conviva-js-coresdk';

type NoStringIndex<T> = { [K in keyof T as string extends K ? never : K]: T[K] };

type ReservedContentMetadata = NoStringIndex<Conviva.ConvivaMetadata>;

export type CustomMetadata = Conviva.ContentMetadata['custom'];

export class ContentMetadataBuilder {
  private readonly logger: Conviva.LoggingInterface;

  private metadataOverrides: Partial<Conviva.ContentMetadata> = {};
  private metadata: Partial<Conviva.ContentMetadata> = {};
  private latestBuiltMetadata: Partial<Conviva.ContentMetadata> = {};
  private playbackStarted: boolean = false;

  constructor(logger: Conviva.LoggingInterface) {
    this.logger = logger;
  }

  /**
   * This method is used for custom content metadata updates during / before a session.
   * @param newValue
   */
  setOverrides(newValue: Partial<Conviva.ContentMetadata>) {
    if (this.playbackStarted) {
      this.logger.consoleLog(
        '[ Conviva Analytics ] Playback has started. Only some metadata attributes will be updated',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
    }

    this.metadataOverrides = { ...this.metadataOverrides, ...newValue };
  }

  getOverrides(): Partial<Conviva.ContentMetadata> {
    return this.metadataOverrides;
  }

  setPlaybackStarted(value: boolean) {
    this.playbackStarted = value;
  }

  private getStaticMetadata() {
    const metadata: Partial<Conviva.ContentMetadata> = {};

    // This metadata can only be changed before the playback is started
    if (!this.playbackStarted) {
      // Asset name is only allowed to be set once
      metadata.assetName = this.latestBuiltMetadata.assetName || this.assetName;

      metadata.viewerId = this.viewerId;
      metadata.streamType = this.metadataOverrides.streamType || this.metadata.streamType;
      metadata.applicationName = this.metadataOverrides.applicationName || this.metadata.applicationName;
      metadata.duration = this.metadataOverrides.duration || this.metadata.duration;

      metadata.custom = this.custom;
    }
    // If the playback has been started, the values cannot be changed and the latest values before the playback started has to be used
    else {
      metadata.assetName = this.latestBuiltMetadata.assetName;
      metadata.viewerId = this.latestBuiltMetadata.viewerId;
      metadata.streamType = this.latestBuiltMetadata.streamType;
      metadata.applicationName = this.latestBuiltMetadata.applicationName;
      metadata.duration = this.latestBuiltMetadata.duration;
      metadata.custom = this.latestBuiltMetadata.custom;
    }

    return metadata;
  }

  private getDynamicMetadata(): Partial<Conviva.ContentMetadata> {
    return {
      encodedFrameRate: this.metadataOverrides.encodedFrameRate || this.metadata.encodedFrameRate,
      defaultResource: this.metadataOverrides.defaultResource || this.metadata.defaultResource,
      streamUrl: this.metadataOverrides.streamUrl || this.metadata.streamUrl,
    };
  }

  build(): Conviva.ConvivaMetadata {
    const newMetadata: Partial<Conviva.ContentMetadata> = {
      ...this.getStaticMetadata(),
      ...this.getDynamicMetadata(),
    };

    this.latestBuiltMetadata = newMetadata;

    const newReservedMetadata: ReservedContentMetadata = {
      [Conviva.Constants.ASSET_NAME]: newMetadata.assetName,
      [Conviva.Constants.ENCODED_FRAMERATE]: newMetadata.encodedFrameRate,
      [Conviva.Constants.DURATION]: newMetadata.duration,
      [Conviva.Constants.DEFAULT_RESOURCE]: newMetadata.defaultResource,
      [Conviva.Constants.STREAM_URL]: newMetadata.streamUrl,
      [Conviva.Constants.IS_LIVE]: newMetadata.streamType,
      [Conviva.Constants.VIEWER_ID]: newMetadata.viewerId || 'GET_VIEWER_ID_FROM_PLAYER',
      [Conviva.Constants.PLAYER_NAME]: newMetadata.applicationName || 'GET_PLAYER_NAME_OR_TYPE',
    };

    return {
      ...newReservedMetadata,
      ...newMetadata.custom,
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

  set custom(newValue: Conviva.ContentMetadata['custom']) {
    this.metadata.custom = newValue;
  }

  get custom(): Conviva.ContentMetadata['custom'] {
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
    this.latestBuiltMetadata = undefined;
  }
}
