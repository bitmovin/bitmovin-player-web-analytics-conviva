import * as Conviva from '@convivainc/conviva-js-coresdk';

type NoStringIndex<T> = { [K in keyof T as string extends K ? never : K]: T[K] };

type ReservedContentMetadata = NoStringIndex<Conviva.ConvivaMetadata>;

export type CustomMetadata = Conviva.ContentMetadata['custom'];

export class ContentMetadataBuilder {
  private readonly logger: Conviva.LoggingInterface;

  private metadataOverrides: Partial<Conviva.ContentMetadata> = {};
  private metadata: Partial<Conviva.ContentMetadata> = {};
  private latestBuiltMetadata?: Partial<Conviva.ContentMetadata>;
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

  build(): Conviva.ConvivaMetadata {
    const latestBuiltMetadata: Partial<Conviva.ContentMetadata> = this.latestBuiltMetadata || {};

    if (!this.playbackStarted) {
      // Asset name is only allowed to be set once
      if (!latestBuiltMetadata.assetName) {
        latestBuiltMetadata.assetName = this.assetName;
      }

      latestBuiltMetadata.viewerId = this.viewerId;
      latestBuiltMetadata.streamType = this.metadataOverrides.streamType || this.metadata.streamType;
      latestBuiltMetadata.applicationName = this.metadataOverrides.applicationName || this.metadata.applicationName;
      latestBuiltMetadata.duration = this.metadataOverrides.duration || this.metadata.duration;

      latestBuiltMetadata.custom = this.custom;
    }

    latestBuiltMetadata.encodedFrameRate = this.metadataOverrides.encodedFrameRate || this.metadata.encodedFrameRate;
    latestBuiltMetadata.defaultResource = this.metadataOverrides.defaultResource || this.metadata.defaultResource;
    latestBuiltMetadata.streamUrl = this.metadataOverrides.streamUrl || this.metadata.streamUrl;

    this.latestBuiltMetadata = latestBuiltMetadata;

    const convivaContentInfo: ReservedContentMetadata = {
      [Conviva.Constants.ASSET_NAME]: latestBuiltMetadata.assetName,
      [Conviva.Constants.ENCODED_FRAMERATE]: latestBuiltMetadata.encodedFrameRate,
      [Conviva.Constants.DURATION]: latestBuiltMetadata.duration,
      [Conviva.Constants.DEFAULT_RESOURCE]: latestBuiltMetadata.defaultResource,
      [Conviva.Constants.STREAM_URL]: latestBuiltMetadata.streamUrl,
      [Conviva.Constants.IS_LIVE]: latestBuiltMetadata.streamType,
      [Conviva.Constants.VIEWER_ID]: latestBuiltMetadata.viewerId || 'GET_VIEWER_ID_FROM_PLAYER',
      [Conviva.Constants.PLAYER_NAME]: latestBuiltMetadata.applicationName || 'GET_PLAYER_NAME_OR_TYPE',
    };

    return {
      ...convivaContentInfo,
      ...latestBuiltMetadata.custom,
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
