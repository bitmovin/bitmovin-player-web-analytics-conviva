import * as Conviva from '@convivainc/conviva-js-coresdk';

export class Html5Timer implements Conviva.TimerInterface {
  public createTimer(timerAction: Conviva.TimerAction, intervalMs: number, actionName?: string | null): Conviva.TimerCancelFunction {
    let timerId = window.setInterval(timerAction, intervalMs);
    return function () {
      if (timerId !== -1) {
        clearInterval(timerId);
        timerId = -1;
      }
    };
  }

  public release(): void {
    // nothing to release
  }
}
