import * as Conviva from '@convivainc/conviva-js-coresdk';

export class Html5Storage implements Conviva.StorageInterface {
  public saveData(storageSpace: string, storageKey: string, data: string, callback: Conviva.StorageSaveDataCallback): void {
    const localStorageKey = storageSpace + '.' + storageKey;
    try {
      localStorage.setItem(localStorageKey, data);
      callback(true, null);
    } catch (e) {
      callback(false, e.toString());
    }
  }

  public loadData(storageSpace: string, storageKey: string, callback: Conviva.StorageLoadDataCallback): void {
    const localStorageKey = storageSpace + '.' + storageKey;
    try {
      const data = localStorage.getItem(localStorageKey);
      callback(true, data);
    } catch (e) {
      callback(false, e.toString());
    }
  }

  public release() {
    // nothing to release
  }
}
