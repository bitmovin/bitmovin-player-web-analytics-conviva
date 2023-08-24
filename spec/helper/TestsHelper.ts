import { BrowserUtils } from '../../src/ts/helper/BrowserUtils';
jest.mock('../../src/ts/helper/BrowserUtils');

beforeAll(() => {
  BrowserUtils.isMobile = jest.fn().mockReturnValue(false);
});
