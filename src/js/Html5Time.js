/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimeInterface for Chrome.

function Html5Time () {

    function _constr() {
        // nothing to initialize
    }

    _constr.apply(this, arguments);

    this.getEpochTimeMs = function () {
        var d = new Date();
        return d.getTime();
    };

    this.release = function() {
        // nothing to release
    };
}

