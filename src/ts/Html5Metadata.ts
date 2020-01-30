import Client = Conviva.Client;
import { DeviceMetadata } from './DeviceMetadata';

export class Html5Metadata implements Conviva.MetadataInterface {
  metadata?: DeviceMetadata;

  constructor(metadata?: DeviceMetadata) {
    this.metadata = metadata;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getBrowserName(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getBrowserVersion(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getDeviceBrand(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getDeviceManufacturer(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getDeviceModel(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getDeviceType(): Client.DeviceType {
    return null;
  }

  // There is no value we can access that qualifies as the device version.
  public getDeviceVersion(): string | null {
    return null;
  }

  // HTML5 can qualify as an application framework of sorts.
  public getFrameworkName(): string | null {
    return 'HTML5';
  }

  // No convenient way to detect HTML5 version.
  public getFrameworkVersion(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getOperatingSystemName(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  public getOperatingSystemVersion(): string | null {
    return null;
  }

  // Relying on HTTP user agent string parsing on the Conviva Platform.
  getDeviceCategory(): Conviva.Client.DeviceCategory {
    return this.metadata.deviceCategory;
  }

  public release(): void {
    // nothing to release
  }

}
