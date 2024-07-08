import { Ad, AdBreak, AdBreakEvent, AdData, AdEvent, ErrorCode, LinearAd, PlayerAPI, PlayerEvent } from "bitmovin-player";
import { AdHelper } from "../../src/ts/helper/AdHelper";
import * as Conviva from '@convivainc/conviva-js-coresdk';

describe(AdHelper, () => {
  describe('mapAdPosition', () => {
    it('should map ad position to preroll', () => {
      const player = {
        getDuration: () => 100,
      } as PlayerAPI;
      const adBreak = {
        scheduleTime: 0
      } as AdBreak;

      expect(AdHelper.mapCsaiAdPosition(adBreak, player)).toEqual(Conviva.Constants.AdPosition.PREROLL)
    })

    it('should map ad position to postroll', () => {
      const player = {
        getDuration: () => 100,
      } as PlayerAPI;
      const adBreak = {
        scheduleTime: 100
      } as AdBreak;

      expect(AdHelper.mapCsaiAdPosition(adBreak, player)).toEqual(Conviva.Constants.AdPosition.POSTROLL)
    })

    it('should map ad position to midroll', () => {
      const player = {
        getDuration: () => 100,
      } as PlayerAPI;
      const adBreak = {
        scheduleTime: 50
      } as AdBreak;

      expect(AdHelper.mapCsaiAdPosition(adBreak, player)).toEqual(Conviva.Constants.AdPosition.MIDROLL)
    })
  })

  describe('formatAdErrorEvent', () => {
    it('should format error message', () => {
      expect(AdHelper.formatCsaiAdError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'Test error',
        troubleShootLink: 'https://test.com',
        timestamp: Date.now(),
        type: PlayerEvent.Error,
      })).toEqual('Ad error: Test error; Message: Unknown message; Error code: 1400; Troubleshoot link: https://test.com')
    })

    it('should format full error message', () => {
      expect(AdHelper.formatCsaiAdError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'Test error',
        troubleShootLink: 'https://test.com',
        timestamp: Date.now(),
        type: PlayerEvent.Error,
        message: 'Test message',
        data: {
          code: 123
        },
      })).toEqual('Ad error: Test error; Ad error code: 123; Message: Test message; Error code: 1400; Troubleshoot link: https://test.com')
    })
  })

  describe('extractConvivaAdInfo', () => {
    it('should extract minimal Conviva ad info', () => {
      const player = {} as PlayerAPI;
      const adBreakEvent = {
        adBreak: {
          scheduleTime: 0
        }
      } as AdBreakEvent;
      const adEvent = {
        ad: {
          id: '123',
          data: {},
        },
      } as AdEvent;

      expect(AdHelper.extractCsaiConvivaAdInfo(player, adBreakEvent, adEvent)).toEqual({
        "c3.ad.creativeId": "NA",
        "c3.ad.firstAdId": "123",
        "c3.ad.firstAdSystem": "NA",
        "c3.ad.firstCreativeId": "NA",
        "c3.ad.id": "123",
        "c3.ad.mediaFileApiFramework": "NA",
        "c3.ad.position": "Pre-roll",
        "c3.ad.system": "NA",
        "c3.ad.technology": "Client Side",
        [Conviva.Constants.ASSET_NAME]: 'NA',
        [Conviva.Constants.STREAM_URL]: 'NA',
      })
    })

    it('should extract full Conviva ad info', () => {
      const player = {} as PlayerAPI;
      const adBreakEvent = {
        adBreak: {
          scheduleTime: 0
        }
      } as AdBreakEvent;
      const adEvent = {
        ad: {
          id: '123',
          mediaFileUrl: 'https://test.com',
          duration: 100,
          data: {
            adSystem: {
              name: 'Test system'
            },
            creative: {
              id: '456'
            },
            adTitle: 'Test title',
            wrapperAdIds: ['789']
          } as AdData,
        } as Ad | LinearAd,
      } as AdEvent;

      expect(AdHelper.extractCsaiConvivaAdInfo(player, adBreakEvent, adEvent)).toEqual({
        [Conviva.Constants.ASSET_NAME]: "Test title",
        [Conviva.Constants.STREAM_URL]: 'https://test.com',
        [Conviva.Constants.DURATION]: 100,
        "c3.ad.creativeId": "456",
        "c3.ad.firstAdId": "789",
        "c3.ad.firstAdSystem": "NA",
        "c3.ad.firstCreativeId": "NA",
        "c3.ad.id": "123",
        "c3.ad.mediaFileApiFramework": "NA",
        "c3.ad.position": "Pre-roll",
        "c3.ad.system": "Test system",
        "c3.ad.technology": "Client Side",
      })
    })
  })
})
