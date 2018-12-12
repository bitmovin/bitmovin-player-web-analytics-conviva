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
