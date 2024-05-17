import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import * as Conviva from '@convivainc/conviva-js-coresdk';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe('content metadata spec', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let convivaVideoAnalytics: Conviva.VideoAnalytics;

  beforeEach(() => {
    playerMock = MockHelper.getPlayerMock();
    convivaVideoAnalytics = Conviva.Analytics.buildVideoAnalytics();

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('when initializing session', () => {
    it('set player info name', () => {
      playerMock.eventEmitter.firePlayEvent();

      expect(convivaVideoAnalytics.setPlayerInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frameworkName: 'bitdash',
          frameworkVersion: '8.0.0',
        }),
      );
    });
  });
});
