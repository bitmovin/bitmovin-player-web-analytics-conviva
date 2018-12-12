/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.LoggingInterface for Chrome.

import Conviva from './Conviva';
import SystemSettings = Conviva.SystemSettings;

export class Html5Logging implements Conviva.LoggingInterface {

  public consoleLog(message: string, logLevel: SystemSettings.LogLevel): void {
      if (typeof console === 'undefined') {
          return;
      }
      if (console.log && logLevel === Conviva.SystemSettings.LogLevel.DEBUG ||
      logLevel === Conviva.SystemSettings.LogLevel.INFO) {
      console.log(message);
    } else if (console.warn && logLevel === Conviva.SystemSettings.LogLevel.WARNING) {
      console.warn(message);
    } else if (console.error && logLevel === Conviva.SystemSettings.LogLevel.ERROR) {
      console.error(message);
    }
  }

  public release(): void {
    // nothing to release
  }

}
