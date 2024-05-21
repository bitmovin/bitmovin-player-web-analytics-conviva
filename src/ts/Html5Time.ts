import * as Conviva from '@convivainc/conviva-js-coresdk';

export class Html5Time implements Conviva.TimeInterface {
  public getEpochTimeMs(): number {
    const d = new Date();
    return d.getTime();
  }

  public release(): void {
    // nothing to release
  }
}
