///<reference path="../ts/Conviva.d.ts"/>
/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimerInterface for Chrome.

// setInterval does exactly what we need. We just need to return a function
// which cancels the timer when called.
// Some JavaScript implementations do not have setInterval, in which case
// you may have to write it yourself using setTimeout.

export class Html5Timer implements Conviva.TimerInterface {

  createTimer(timerAction, intervalMs, actionName) {
    let timerId = setInterval(timerAction, intervalMs);
    let cancelTimerFunc = (function() {
      if (timerId !== -1) {
        clearInterval(timerId);
        timerId = -1;
      }
    });
    return cancelTimerFunc;
  }

  release() {
    // nothing to release
  }

}
