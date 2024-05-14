/**
 * Add missing types from `conviva-core-sdk` package.
 */

declare module Conviva {
  class ContentMetadata {
    public static readonly StreamType: Conviva.ConvivaConstants['StreamType']
    public applicationName: string;
    public assetName: string;
    public custom: {};
    public defaultResource: string;
    public duration: number;
    public encodedFrameRate: number;
    public streamType: Conviva.valueof<Conviva.ConvivaConstants['StreamType']>;
    public streamUrl: string;
    public viewerId: string;
    public frameworkVersion: string;
    public framework: string;
  }

  interface LoggingInterface {
    consoleLog(message: string, logLevel: Conviva.valueof<Conviva.ConvivaConstants['LogLevel']>): void;

    release(): void;
  }

  class SystemSettings {
    public static readonly LogLevel: Conviva.ConvivaConstants['LogLevel'];
    public allowUncaughtExceptions: boolean;
    public httpTimeout: number;
    public logLevel: Conviva.valueof<Conviva.ConvivaConstants['LogLevel']>;
    public storageTimeout: number;
  }

  interface TimeInterface {
    getEpochTimeMs(): number;

    release(): void;
  }

  type TimerAction = () => void;

  type TimerCancelFunction = () => void;

  interface TimerInterface {
    createTimer(timerAction: TimerAction, intervalMs: number, actionName?: string | null): TimerCancelFunction;

    release(): void;
  }

  type HttpRequestCancelFunction = () => void;

  type HttpRequestCallback = (succeeded: boolean, data: string) => void;

  interface HttpInterface {
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

  type StorageLoadDataCallback = (succeeded: boolean, data: string | null) => void;

  type StorageSaveDataCallback = (succeeded: boolean, data: string | null) => void;

  interface StorageInterface {
    loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void;

    saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void;

    release(): void;
  }

  interface VideoAnalytics {
    reportAppEvent(eventType: string, eventDetail: { [key: string]: string }): void;
    getSessionId(): number;
  }
}
