/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimerInterface for Chrome.

// setInterval does exactly what we need. We just need to return a function 
// which cancels the timer when called.
// Some JavaScript implementations do not have setInterval, in which case
// you may have to write it yourself using setTimeout.

function Html5Timer () {

    function _constr() {
        // nothing to initialize
    }

    _constr.apply(this, arguments);

    this.createTimer = function (timerAction, intervalMs, actionName) {
        var timerId = setInterval(timerAction, intervalMs);
        var cancelTimerFunc = (function () {
            if (timerId !== -1) {
                clearInterval(timerId);
                timerId = -1;
            }
        });
        return cancelTimerFunc;
    };

    this.release = function() {
        // nothing to release
    };

}

