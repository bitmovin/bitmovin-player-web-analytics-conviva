import { ErrorEvent } from 'bitmovin-player';

type ErrorEventWithData = ErrorEvent & {
  message?: string;
  troubleShootLink?: string;
  data?: any;
};

const KNOWN_DATA_KEYS = [
  'url',
  'requestUrl',
  'manifestUrl',
  'segmentUrl',
  'httpStatusCode',
  'statusCode',
  'status',
  'statusText',
  'response',
  'responseText',
  'responseUrl',
  'responseHeaders',
  'downloadType',
  'mimeType',
  'method',
  'reason',
  'details',
  'cause',
  'errorMessage',
  'errorCode',
  'subCode',
  'retryCount',
];

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      if (typeof val === 'bigint') {
        return val.toString();
      }
      return val;
    });
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

export class ErrorHelper {
  public static formatPlaybackError(event: ErrorEventWithData): string {
    const parts: (string | undefined)[] = [
      `Error code: ${event?.code ?? 'NA'};`,
      `Name: ${event?.name ?? 'NA'};`,
      event?.message ? `Message: ${event.message};` : undefined,
      event?.type ? `Type: ${event.type};` : undefined,
      event?.timestamp ? `Timestamp: ${event.timestamp};` : undefined,
    ];

    const data = event?.data;
    if (data && typeof data === 'object') {
      const extracted: string[] = [];
      const remaining: Record<string, unknown> = {};

      for (const key of Object.keys(data)) {
        const value = (data as Record<string, unknown>)[key];
        if (value === undefined || value === null || value === '') {
          continue;
        }
        if (KNOWN_DATA_KEYS.indexOf(key) !== -1) {
          extracted.push(`${key}: ${safeStringify(value)};`);
        } else {
          remaining[key] = value;
        }
      }

      parts.push(...extracted);

      if (Object.keys(remaining).length > 0) {
        parts.push(`data: ${safeStringify(remaining)};`);
      }
    } else if (data !== undefined && data !== null && data !== '') {
      parts.push(`data: ${safeStringify(data)};`);
    }

    if (event?.troubleShootLink) {
      parts.push(`Troubleshoot link: ${event.troubleShootLink};`);
    }

    return parts.filter(Boolean).join(' ');
  }
}
