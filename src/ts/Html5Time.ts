/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimeInterface for Chrome.

import Conviva from './Conviva';

export class Html5Time implements Conviva.TimeInterface {

  public getEpochTimeMs(): number {
    const d = new Date();
    return d.getTime();
  }

  public release(): void {
    // nothing to release
  }
}
