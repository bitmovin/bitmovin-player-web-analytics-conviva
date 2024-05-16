/**
 * The following properties exist in the `window.Conviva` object but they are missing
 * in types of `conviva-core-sdk` package for some reason, so let's add them manually.
 *
 * Keep this in the source code, so the types are available in the compiled code therefore in the consuming projects as well.
 */

import * as Conviva from '@convivainc/conviva-js-coresdk';

declare module '@convivainc/conviva-js-coresdk' {
  export class ContentMetadata {
    public static readonly StreamType: Conviva.ConvivaConstants['StreamType'];

    // Can only be set once
    public assetName: string;

    // Can only be set before playback started
    public viewerId: string;
    public streamType: Conviva.valueof<Conviva.ConvivaConstants['StreamType']>;
    public applicationName: string;
    public custom: Record<string, string>;
    public duration: number;

    // Dynamic
    public defaultResource: string;
    public encodedFrameRate: number;
    public streamUrl: string;
  }

  export interface LoggingInterface {
    consoleLog(message: string, logLevel: Conviva.valueof<Conviva.ConvivaConstants['LogLevel']>): void;

    release(): void;
  }

  export class SystemSettings {
    public static readonly LogLevel: Conviva.ConvivaConstants['LogLevel'];
    public allowUncaughtExceptions: boolean;
    public httpTimeout: number;
    public logLevel: Conviva.valueof<Conviva.ConvivaConstants['LogLevel']>;
    public storageTimeout: number;
  }

  export interface TimeInterface {
    getEpochTimeMs(): number;

    release(): void;
  }

  export type TimerAction = () => void;

  export type TimerCancelFunction = () => void;

  export interface TimerInterface {
    createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction;

    release(): void;
  }

  export type HttpRequestCancelFunction = () => void;

  export type HttpRequestCallback = (succeeded: boolean, data: string) => void;

  export interface HttpInterface {
    makeRequest(
      httpMethod: 'GET' | 'POST',
      url: string,
      data: string | null,
      contentType: string | null,
      timeoutMs: number,
      callback: HttpRequestCallback | null,
    ): HttpRequestCancelFunction;

    release(): void;
  }

  export type StorageLoadDataCallback = (succeeded: boolean, data: string | null) => void;

  export type StorageSaveDataCallback = (succeeded: boolean, data: string | null) => void;

  export interface StorageInterface {
    loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void;

    saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void;

    release(): void;
  }

  export interface VideoAnalytics {
    reportAppEvent(eventType: string, eventDetail: { [key: string]: string }): void;
    getSessionId(): number;
  }
}

// This is required, otherwise this file cannot be imported (would fail in runtime without it).
export {};
