import { ErrorCode, PlayerEvent } from 'bitmovin-player';
import { ErrorHelper } from '../../src/ts/helper/ErrorHelper';

describe(ErrorHelper, () => {
  describe('formatPlaybackError', () => {
    it('should format minimal error with only code and name', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
      });

      expect(result).toContain('Error code: 1400;');
      expect(result).toContain('Name: NETWORK_ERROR;');
      expect(result).toContain('Type: error;');
      expect(result).toContain('Timestamp: 1700000000000;');
      expect(result).not.toContain('Troubleshoot link:');
    });

    it('should include message and troubleshoot link when present', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        message: 'Network failure',
        troubleShootLink: 'https://bitmovin.com/troubleshoot/1400',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
      });

      expect(result).toContain('Message: Network failure;');
      expect(result).toContain('Troubleshoot link: https://bitmovin.com/troubleshoot/1400;');
    });

    it('should extract URL and HTTP status from event.data', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        message: 'Segment download failed',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          url: 'https://cdn.example.com/segment_1.ts',
          httpStatusCode: 404,
          statusText: 'Not Found',
          downloadType: 'media/video',
        },
      });

      expect(result).toContain('url: https://cdn.example.com/segment_1.ts;');
      expect(result).toContain('httpStatusCode: 404;');
      expect(result).toContain('statusText: Not Found;');
      expect(result).toContain('downloadType: media/video;');
    });

    it('should serialize unknown data fields under "data:"', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          url: 'https://cdn.example.com/manifest.m3u8',
          customField: { nested: 'value' },
          anotherCustomField: 42,
        },
      });

      expect(result).toContain('url: https://cdn.example.com/manifest.m3u8;');
      expect(result).toContain('data: {"customField":{"nested":"value"},"anotherCustomField":42};');
    });

    it('should handle non-object data values', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.SOURCE_ERROR,
        name: 'SOURCE_ERROR',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: 'something went wrong',
      } as any);

      expect(result).toContain('data: something went wrong;');
    });

    it('should handle circular references in data', () => {
      const circular: any = { url: 'https://cdn.example.com/x', extra: {} };
      circular.extra.self = circular;

      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: circular,
      });

      expect(result).toContain('url: https://cdn.example.com/x;');
      expect(result).toContain('[Circular]');
    });

    it('should fall back to "NA" for missing code and name', () => {
      const result = ErrorHelper.formatPlaybackError({
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
      } as any);

      expect(result).toContain('Error code: NA;');
      expect(result).toContain('Name: NA;');
    });

    it('should skip null, undefined, and empty data values', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          url: 'https://cdn.example.com/x',
          httpStatusCode: null,
          statusText: '',
          response: undefined,
        },
      });

      expect(result).toContain('url: https://cdn.example.com/x;');
      expect(result).not.toContain('httpStatusCode:');
      expect(result).not.toContain('statusText:');
      expect(result).not.toContain('response:');
    });

    it('should keep timestamp 0 and empty-string type instead of dropping them', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 0,
        type: '' as any,
      });

      expect(result).toContain('Timestamp: 0;');
      expect(result).toContain('Type: ;');
    });

    it('should redact sensitive query-string parameters in URL fields', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          url: 'https://cdn.example.com/asset.m3u8?token=abc123&region=eu&sig=deadbeef',
        },
      });

      expect(result).toContain('https://cdn.example.com/asset.m3u8?');
      expect(result).toContain('token=[REDACTED]');
      expect(result).toContain('sig=[REDACTED]');
      expect(result).toContain('region=eu');
      expect(result).not.toContain('abc123');
      expect(result).not.toContain('deadbeef');
    });

    it('should redact sensitive HTTP headers in responseHeaders', () => {
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          responseHeaders: {
            'Content-Type': 'video/mp4',
            Authorization: 'Bearer super-secret-token',
            Cookie: 'session=abc',
            'X-Api-Key': 'k-1234',
          },
        },
      });

      expect(result).toContain('Content-Type');
      expect(result).toContain('video/mp4');
      expect(result).toContain('"Authorization":"[REDACTED]"');
      expect(result).toContain('"Cookie":"[REDACTED]"');
      expect(result).toContain('"X-Api-Key":"[REDACTED]"');
      expect(result).not.toContain('super-secret-token');
      expect(result).not.toContain('session=abc');
      expect(result).not.toContain('k-1234');
    });

    it('should truncate very long known field values', () => {
      const longBody = 'x'.repeat(2000);
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          responseText: longBody,
        },
      });

      expect(result).toContain('[truncated');
      expect(result).not.toContain(longBody);
    });

    it('should serialize BigInt values in known fields and remaining data', () => {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const globalRef = Function('return this')() as { BigInt?: (v: string) => unknown };
      const BigIntCtor = globalRef.BigInt;
      if (typeof BigIntCtor !== 'function') {
        // Skip on platforms without BigInt support.
        return;
      }
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: {
          retryCount: BigIntCtor('9007199254740993'),
          customCounter: BigIntCtor('12345678901234567890'),
        },
      });

      expect(result).toContain('retryCount: 9007199254740993;');
      expect(result).toContain('"customCounter":"12345678901234567890"');
    });

    it('should not produce "undefined" output for unserializable data values', () => {
      const symbolValue: any = Symbol('only-a-symbol');
      const result = ErrorHelper.formatPlaybackError({
        code: ErrorCode.NETWORK_ERROR,
        name: 'NETWORK_ERROR',
        troubleShootLink: '',
        timestamp: 1700000000000,
        type: PlayerEvent.Error,
        data: symbolValue,
      });

      expect(result).not.toContain('undefined');
      expect(result).toContain('data:');
    });
  });
});
