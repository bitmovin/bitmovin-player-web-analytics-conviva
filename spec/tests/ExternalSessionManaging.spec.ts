import { PlayerAPI } from 'bitmovin-player';
import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, PlayerEventHelper } from '../helper/MockHelper';

jest.mock('@convivainc/conviva-js-coresdk', () => {
  const { MockHelper } = jest.requireActual('../helper/MockHelper');
  return MockHelper.createConvivaMock();
});
jest.mock('../../src/ts/Html5Logging');

describe('externally session managing', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: PlayerAPI;
  let playerEventHelper: PlayerEventHelper

  beforeEach(() => {
    ({ playerMock, playerEventHelper } = MockHelper.createPlayerMock());

    convivaAnalytics = new ConvivaAnalytics(playerMock, 'TEST-KEY');

    jest.spyOn(playerMock, 'getSource').mockReturnValue({
      hls: 'test.m3u8',
      title: 'Asset Title',
    });
  });

  describe('before loading source', () => {
    beforeEach(() => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue(null);
    });

    it('throw without asset name initialize session', () => {
      expect(convivaAnalytics.initializeSession.bind(convivaAnalytics)).toThrow(
        'Player is attached but no source is loaded and `assetName` is empty in the content metadata. Either load a source before calling `initializeSession` or set the `assetName` manually using `updateContentMetadata`.',
      );
    });

    it('initialize session with asset name', () => {
      convivaAnalytics.updateContentMetadata({ assetName: 'name to init' });
      convivaAnalytics.initializeSession();

      expect(MockHelper.latestVideoAnalytics.getSessionId).toHaveBeenCalledTimes(1);
    });
  });

  describe('after loading source', () => {
    it('initialize session with source name', () => {
      convivaAnalytics.initializeSession();

      // TODO: test content metadata
      expect(MockHelper.latestVideoAnalytics.getSessionId).toHaveBeenCalledTimes(1);
    });
  });

  it('should not init once initialized', () => {
    playerEventHelper.firePlayEvent();

    (MockHelper.latestVideoAnalytics.getSessionId as any).mockClear();
    convivaAnalytics.initializeSession();
    expect(MockHelper.latestVideoAnalytics.getSessionId).not.toHaveBeenCalled();
  });
});
