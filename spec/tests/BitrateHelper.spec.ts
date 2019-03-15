import { BitrateHelper } from '../../src/ts/helper/BitrateHelper';

describe('BitrateHelper', () => {
  describe('calculateKbps', () => {
    it('convert bps to kbps', () => {
      expect(BitrateHelper.calculateKbps(250_000)).toEqual(250);
    });
  });
});
