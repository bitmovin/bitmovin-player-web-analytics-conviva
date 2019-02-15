import { ConvivaAnalytics } from '../../src/ts';
import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';

describe('externally session managing', () => {
  let convivaAnalytics: ConvivaAnalytics;
  let playerMock: TestingPlayerAPI;
  let clientMock: Conviva.Client;
  let playerStateMock: Conviva.PlayerStateManager;

  beforeEach(() => {
    MockHelper.mockConviva();

    playerMock = MockHelper.getPlayerMock();
    clientMock = MockHelper.getConvivaClientMock();
    playerStateMock = clientMock.getPlayerStateManager();

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
      expect(convivaAnalytics.initializeSession.bind(convivaAnalytics)).toThrow('AssetName is missing. Load player source first or set assetName via updateContentMetadata');
    });

    it('initialize session with asset name', () => {
      convivaAnalytics.updateContentMetadata({ assetName: 'name to init' });
      convivaAnalytics.initializeSession();

      expect(clientMock.createSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('after loading source', () => {
    it('initialize session with source name', () => {
      convivaAnalytics.initializeSession();

      // TODO: test content metadata
      expect(clientMock.createSession).toHaveBeenCalledTimes(1);
    });
  });

  it('should not init once initialized', () => {
    playerMock.eventEmitter.firePlayEvent();

    (clientMock.createSession as any).mockClear();
    convivaAnalytics.initializeSession();
    expect(clientMock.createSession).not.toHaveBeenCalled();
  });

  describe('multiple sessions', () => {
    it('take the asset name from the source in a consecutive session', () => {
      jest.spyOn(playerMock, 'getSource').mockReturnValue(undefined);

      convivaAnalytics.updateContentMetadata({ assetName: 'MyAsset' });
      convivaAnalytics.initializeSession();
      expect((clientMock.createSession as jest.Mock).mock.calls[0][0].assetName).toEqual('MyAsset');
      convivaAnalytics.endSession();
      (clientMock.createSession as any).mockClear();

      jest.spyOn(playerMock, 'getSource').mockReturnValue({ title: 'MyTitle' });
      convivaAnalytics.updateContentMetadata({ assetName: null });
      convivaAnalytics.initializeSession();
      expect((clientMock.createSession as jest.Mock).mock.calls[0][0].assetName).toEqual('MyTitle');
    });
  });
});
