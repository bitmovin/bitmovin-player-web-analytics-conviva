import { ConvivaAnalytics } from '../src/ts';

jest.mock('../src/ts/ConvivaAnalytics');

describe('Test Set', () => {
  it('pass', () => {
    let x = new ConvivaAnalytics(undefined, undefined);
    // x.release();
    expect(true).toBeTruthy();
  });

  test('fail', () => {
    expect(true).toBeTruthy();
  });

});
