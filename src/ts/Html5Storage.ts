/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.StorageInterface for Chrome.

// HTML5 localStorage relies on a single key to index items,
// so we find a consistent way to combine storageSpace and storageKey.

import Conviva from './Conviva';
import StorageLoadDataCallback = Conviva.StorageLoadDataCallback;
import StorageSaveDataCallback = Conviva.StorageSaveDataCallback;

export class Html5Storage implements Conviva.StorageInterface {

  public saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void {
    const localStorageKey = storageSpace + '.' + storageKey;
    try {
      localStorage.setItem(localStorageKey, data);
      callback(true, null);
    } catch (e) {
      callback(false, e.toString());
    }
  }

  public loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void {
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
