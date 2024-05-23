import { PlayerAPI } from 'bitmovin-player';
import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, PlayerEventHelper } from '../helper/MockHelper';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe('content metadata spec', () => {
  let playerMock: PlayerAPI;
  let playerEventHelper: PlayerEventHelper

  beforeEach(() => {
    ({ playerMock, playerEventHelper } = MockHelper.createPlayerMock());

    new ConvivaAnalytics(playerMock, 'TEST-KEY');
  });

  describe('when initializing session', () => {
    it('set player info', () => {
      playerEventHelper.firePlayEvent();

      expect(MockHelper.latestVideoAnalytics.setPlayerInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frameworkName: 'Bitmovin Player',
          frameworkVersion: '8.0.0',
        }),
      );
    });
  });
});
