import { ConvivaAnalytics } from '../src/ts/ConvivaAnalytics';

jest.mock('../src/ts/ConvivaAnalytics');

describe('Test Set', () => {
  it('pass', () => {
    let x = new ConvivaAnalytics();
    // x.release();
    expect(true).toBeTruthy();
  });

  test('fail', () => {
    expect(true).toBeTruthy();
  });

})
