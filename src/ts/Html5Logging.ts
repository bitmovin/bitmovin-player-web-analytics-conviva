///<reference path="../ts/Conviva.d.ts"/>
/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.LoggingInterface for Chrome.

export class Html5Logging implements Conviva.LoggingInterface {

  consoleLog(message, logLevel) {
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

  release() {
    // nothing to release
  }

}

