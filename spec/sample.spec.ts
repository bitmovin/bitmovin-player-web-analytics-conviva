import { ConvivaAnalytics } from '../src/ts/';

describe('Test Set', () => {
  it('pass', () => {
    let x = new ConvivaAnalytics(undefined, undefined, undefined);
    // x.release();
    expect(true).toBeTruthy();
  });

  test('fail', () => {
    expect(true).toBeTruthy();
  });

})
