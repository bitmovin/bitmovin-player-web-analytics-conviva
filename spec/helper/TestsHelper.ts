import { BrowserUtils} from '../../src/ts/BrowserUtils';
jest.mock('../../src/ts/BrowserUtils');

beforeAll(() => {
  BrowserUtils.isMobile = jest.fn().mockReturnValue(false);
});
