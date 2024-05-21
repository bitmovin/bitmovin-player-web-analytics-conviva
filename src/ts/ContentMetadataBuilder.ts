import * as Conviva from '@convivainc/conviva-js-coresdk';

type NoStringIndex<T> = { [K in keyof T as string extends K ? never : K]: T[K] };

type DefinedInSdkMetadata = NoStringIndex<Conviva.ConvivaMetadata>;

export type Metadata = Conviva.ContentMetadata & {
  // Actually, Conviva accepts custom tags and standard in the custom object, but we want to have better typing and API.
  // These tags are merged to the same object as the `custom` tags.
  // Find the list:
  // - Here https://pulse.conviva.com/app/appmanager/meta-data (Required Metadata tab)
  // - Or here https://pulse.conviva.com/learning-center/content/sensor_developer_center/sensor_integration/javascript/js_quick_integration.htm
  //   under "Constants for Pre-defined Video and Content Metadata"
  additionalStandardTags: Conviva.ContentMetadata['custom'];
};

export class ContentMetadataBuilder {
  private readonly logger: Conviva.LoggingInterface;

  private metadataOverrides: Partial<Metadata> = {};
  private metadata: Partial<Metadata> = {};
  private latestBuiltMetadata: Partial<Metadata> = {};
  private playbackStarted: boolean = false;

  constructor(logger: Conviva.LoggingInterface) {
    this.logger = logger;
  }

  /**
   * This method is used for custom content metadata updates during / before a session.
   * @param newValue
   */
  setOverrides(newValue: Partial<Metadata>) {
    if (this.playbackStarted) {
      this.logger.consoleLog(
        '[ Conviva Analytics ] Playback has started. Only some metadata attributes will be updated',
        Conviva.SystemSettings.LogLevel.WARNING,
      );
    }

    this.metadataOverrides = { ...this.metadataOverrides, ...newValue };
  }

  getOverrides(): Partial<Metadata> {
    return this.metadataOverrides;
  }

  setPlaybackStarted(value: boolean) {
    this.playbackStarted = value;
  }

  private getStaticMetadata(): Partial<Conviva.ContentMetadata> {
    const metadata: Partial<Conviva.ContentMetadata> = {};

    // This metadata can only be changed before the playback is started
    if (!this.playbackStarted) {
      // Asset name is only allowed to be set once
      metadata.assetName = this.latestBuiltMetadata.assetName || this.assetName;

      metadata.viewerId = this.viewerId;
      metadata.streamType = this.metadataOverrides.streamType || this.metadata.streamType;
      metadata.applicationName = this.metadataOverrides.applicationName || this.metadata.applicationName;
      metadata.duration = this.metadataOverrides.duration || this.metadata.duration;

      metadata.custom = {
        ...this.metadataOverrides.custom,
        ...this.metadataOverrides.additionalStandardTags,
        // Keep our custom tags in case someone tries to override them
        ...this.metadata.custom,
      };
    } else {
      // If the playback has been started, the values cannot be changed and the latest values before the playback started have to be used

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
    const newMetadata: Partial<Metadata> = {
      ...this.getStaticMetadata(),
      ...this.getDynamicMetadata(),
    };

    this.latestBuiltMetadata = newMetadata;

    const newDefinedInSdkMetadata: DefinedInSdkMetadata = {
      [Conviva.Constants.ASSET_NAME]: newMetadata.assetName,
      [Conviva.Constants.ENCODED_FRAMERATE]: newMetadata.encodedFrameRate,
      [Conviva.Constants.DURATION]: newMetadata.duration,
      [Conviva.Constants.DEFAULT_RESOURCE]: newMetadata.defaultResource,
      [Conviva.Constants.STREAM_URL]: newMetadata.streamUrl,
      // If you follow the `IS_LIVE` constant you will find out that it's mapped to `Conviva.streamType`.
      // That's why we set `streamType` here. It's not a mistake.
      // Conviva automatically infers "Is live" from the stream type on their side.
      [Conviva.Constants.IS_LIVE]: newMetadata.streamType,
      [Conviva.Constants.VIEWER_ID]: newMetadata.viewerId || 'GET_VIEWER_ID_FROM_PLAYER',
      // It's not a mistake, "Application name" and "Player name" are referenced interchangeably on Conviva in some places
      [Conviva.Constants.PLAYER_NAME]: newMetadata.applicationName || 'GET_PLAYER_NAME_OR_TYPE',
    };

    return {
      ...newDefinedInSdkMetadata,
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

  addToCustom(toAdd: Metadata['custom']) {
    this.metadata.custom = { ...this.metadata.custom, ...toAdd };
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
    this.latestBuiltMetadata = {};
  }
}
