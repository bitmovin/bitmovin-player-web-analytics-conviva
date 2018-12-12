/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.TimerInterface for Chrome.

// setInterval does exactly what we need. We just need to return a function
// which cancels the timer when called.
// Some JavaScript implementations do not have setInterval, in which case
// you may have to write it yourself using setTimeout.

import Conviva from './Conviva';
import TimerCancelFunction = Conviva.TimerCancelFunction;
import TimerAction = Conviva.TimerAction;

export class Html5Timer implements Conviva.TimerInterface {

  public createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction {
    let timerId = setInterval(timerAction, intervalMs);
    const cancelTimerFunc = (function() {
      if (timerId !== -1) {
        clearInterval(timerId);
        timerId = -1;
      }
    });
    return cancelTimerFunc;
  }

  public release(): void {
    // nothing to release
  }

}
