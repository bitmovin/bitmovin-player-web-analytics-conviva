///<reference path="../ts/Conviva.d.ts"/>
/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.MetadataInterface for Chrome.

// The Conviva Platform will recognize HTTP user agent strings for major browsers,
// and use these to fill in some of the missing metadata.
// You can validate the resulting metadata through our validation tools.
// If you wish you can maintain your own user agent string parsing on the client side
// instead, and use it to supply the requested Conviva data.

export class Html5Metadata implements Conviva.MetadataInterface {

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getBrowserName() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getBrowserVersion() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getDeviceBrand() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getDeviceManufacturer() {
        return null;
    }
    
    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getDeviceModel() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getDeviceType() {
        return null;
    }

    // There is no value we can access that qualifies as the device version.
    getDeviceVersion() {
        return null;
    }

    // HTML5 can qualify as an application framework of sorts.
    getFrameworkName() {
        return "HTML5";
    }

    // No convenient way to detect HTML5 version.
    getFrameworkVersion() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getOperatingSystemName() {
        return null;
    }

    // Relying on HTTP user agent string parsing on the Conviva Platform.
    getOperatingSystemVersion() {
        return null;
    }

    release() {
        // nothing to release
    }

}

