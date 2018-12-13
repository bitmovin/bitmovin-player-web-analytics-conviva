import TimerCancelFunction = Conviva.TimerCancelFunction;
import TimerAction = Conviva.TimerAction;

export class Html5Timer implements Conviva.TimerInterface {

  public createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction {
    let timerId = setInterval(timerAction, intervalMs);
    return (function () {
      if (timerId !== -1) {
        clearInterval(timerId);
        timerId = -1;
      }
    });
  }

  public release(): void {
    // nothing to release
  }

}
