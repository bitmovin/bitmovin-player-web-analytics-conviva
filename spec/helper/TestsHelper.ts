import { BrowserUtils} from '../../src/ts/helper/BrowserUtils';
jest.mock('../../src/ts/helper/BrowserUtils');

export const CONTENT_SESSION_KEY: number = 0;
export const AD_SESSION_KEY: number = 1;

beforeAll(() => {
  BrowserUtils.isMobile = jest.fn().mockReturnValue(false);
});
