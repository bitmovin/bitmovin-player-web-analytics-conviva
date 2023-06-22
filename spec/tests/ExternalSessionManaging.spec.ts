import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';

jest.mock('../../src/ts/Html5Logging');

describe('externally session managing', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let convivaVideoAnalyticsMock: Conviva.ConvivaVideoAnalytics;

  beforeEach(() => {
    MockHelper.mockConviva();

    playerMock = MockHelper.getPlayerMock();

    convivaVideoAnalyticsMock = Conviva.Analytics.buildVideoAnalytics();

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('before loading source', () => {
    beforeEach(() => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue(undefined);
    });

    it('throw without asset name initialize session', () => {
      expect(convivaAnalytics.initializeSession.bind(convivaAnalytics)).toThrow(
        'AssetName is missing. Load player source first or set assetName via updateContentMetadata'
      );
    });

    it('initialize session with asset name', () => {
      convivaAnalytics.updateContentMetadata({ assetName: 'name to init' });
      convivaAnalytics.initializeSession();

      expect(convivaVideoAnalyticsMock.getSessionId).toHaveBeenCalledTimes(1);
    });
  });

  describe('after loading source', () => {
    it('initialize session with source name', () => {
      convivaAnalytics.initializeSession();

      // TODO: test content metadata
      expect(convivaVideoAnalyticsMock.getSessionId).toHaveBeenCalledTimes(1);
    });
  });

  it('should not init once initialized', () => {
    playerMock.eventEmitter.firePlayEvent();

    (convivaVideoAnalyticsMock.getSessionId as any).mockClear();
    convivaAnalytics.initializeSession();
    expect(convivaVideoAnalyticsMock.getSessionId).not.toHaveBeenCalled();
  });
});
