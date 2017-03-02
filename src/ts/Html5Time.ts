///<reference path="../ts/Conviva.d.ts"/>
/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimeInterface for Chrome.

export class Html5Time implements Conviva.TimeInterface {

    getEpochTimeMs() {
        let d = new Date();
        return d.getTime();
    }

    release() {
        // nothing to release
    }
}

