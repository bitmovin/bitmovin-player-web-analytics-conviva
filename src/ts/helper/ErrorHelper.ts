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

const URL_LIKE_KEYS = ['url', 'requestUrl', 'manifestUrl', 'segmentUrl', 'responseUrl'];
const HEADER_LIKE_KEYS = ['responseHeaders'];
const RESPONSE_BODY_KEYS = ['response', 'responseText'];

// Query-string parameter names that commonly carry credentials in signed-URL schemes.
const SENSITIVE_QUERY_PARAMS = [
  'token',
  'access_token',
  'auth',
  'authorization',
  'sig',
  'signature',
  'hmac',
  'key',
  'apikey',
  'api_key',
  'password',
  'secret',
  'session',
  'sessionid',
  'jwt',
  'bearer',
];

// HTTP header names that commonly carry credentials or session identifiers.
const SENSITIVE_HEADER_NAMES = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-session-id',
];

const REDACTED = '[REDACTED]';
const MAX_FIELD_LENGTH = 512;

function truncate(value: string): string {
  if (value.length <= MAX_FIELD_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_FIELD_LENGTH)}…[truncated ${value.length - MAX_FIELD_LENGTH} chars]`;
}

function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return truncate(safeStringify(value));
  }
  const queryIndex = value.indexOf('?');
  if (queryIndex === -1) {
    return truncate(value);
  }
  const base = value.slice(0, queryIndex);
  const query = value.slice(queryIndex + 1);
  const sanitizedPairs = query.split('&').map((pair) => {
    const eq = pair.indexOf('=');
    if (eq === -1) {
      return pair;
    }
    const name = pair.slice(0, eq);
    const val = pair.slice(eq + 1);
    if (SENSITIVE_QUERY_PARAMS.indexOf(name.toLowerCase()) !== -1) {
      return `${name}=${REDACTED}`;
    }
    return `${name}=${val}`;
  });
  return truncate(`${base}?${sanitizedPairs.join('&')}`);
}

function sanitizeHeaders(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return truncate(safeStringify(value));
  }
  const sanitized: Record<string, unknown> = {};
  for (const headerName of Object.keys(value as Record<string, unknown>)) {
    if (SENSITIVE_HEADER_NAMES.indexOf(headerName.toLowerCase()) !== -1) {
      sanitized[headerName] = REDACTED;
    } else {
      sanitized[headerName] = (value as Record<string, unknown>)[headerName];
    }
  }
  return truncate(safeStringify(sanitized));
}

function sanitizeKnownField(key: string, value: unknown): string {
  if (URL_LIKE_KEYS.indexOf(key) !== -1) {
    return sanitizeUrl(value);
  }
  if (HEADER_LIKE_KEYS.indexOf(key) !== -1) {
    return sanitizeHeaders(value);
  }
  if (RESPONSE_BODY_KEYS.indexOf(key) !== -1) {
    return truncate(safeStringify(value));
  }
  return truncate(safeStringify(value));
}

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
  if (typeof value === 'bigint') {
    return value.toString();
  }
  try {
    const seen = new WeakSet<object>();
    const result = JSON.stringify(value, (_key, val) => {
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
    // JSON.stringify returns undefined for unsupported root values (functions,
    // symbols, top-level undefined). Coalesce to a defined string so the
    // function's return contract holds.
    if (result === undefined) {
      try {
        return String(value);
      } catch {
        return '[Unserializable]';
      }
    }
    return result;
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
      // Explicit nullish check so legitimate falsy values (timestamp === 0,
      // type === '') are still reported instead of being silently dropped.
      event?.type !== undefined && event?.type !== null ? `Type: ${event.type};` : undefined,
      event?.timestamp !== undefined && event?.timestamp !== null ? `Timestamp: ${event.timestamp};` : undefined,
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
          extracted.push(`${key}: ${sanitizeKnownField(key, value)};`);
        } else {
          remaining[key] = value;
        }
      }

      parts.push(...extracted);

      if (Object.keys(remaining).length > 0) {
        parts.push(`data: ${truncate(safeStringify(remaining))};`);
      }
    } else if (data !== undefined && data !== null && data !== '') {
      parts.push(`data: ${truncate(safeStringify(data))};`);
    }

    if (event?.troubleShootLink) {
      parts.push(`Troubleshoot link: ${event.troubleShootLink};`);
    }

    return parts.filter(Boolean).join(' ');
  }
}
