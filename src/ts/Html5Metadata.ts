/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.MetadataInterface for Chrome.

// The Conviva Platform will recognize HTTP user agent strings for major browsers,
// and use these to fill in some of the missing metadata.
// You can validate the resulting metadata through our validation tools.
// If you wish you can maintain your own user agent string parsing on the client side
// instead, and use it to supply the requested Conviva data.

import Conviva from './Conviva';
import Client = Conviva.Client;

export class Html5Metadata implements Conviva.MetadataInterface {

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

  public release(): void {
    // nothing to release
  }

}
