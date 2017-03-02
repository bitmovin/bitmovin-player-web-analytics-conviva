///<reference path="../ts/Conviva.d.ts"/>
/*! (C) 2016 Conviva, Inc. All rights reserved. Confidential and proprietary. */
/*! This is sample code meant to illustrate proper Conviva integration in video applications. */
/*! This file should not be included in video applications as part of integrating Conviva. */

// Implements Conviva.StorageInterface for Chrome.

// HTML5 localStorage relies on a single key to index items,
// so we find a consistent way to combine storageSpace and storageKey.

import StorageLoadDataCallback = Conviva.StorageLoadDataCallback;
import StorageSaveDataCallback = Conviva.StorageSaveDataCallback;

export class Html5Storage implements Conviva.StorageInterface {

  saveData(storageSpace: string, storageKey: string, data: string, callback: StorageSaveDataCallback): void {
    let localStorageKey = storageSpace + '.' + storageKey;
    try {
      localStorage.setItem(localStorageKey, data);
      callback(true, null);
    } catch (e) {
      callback(false, e.toString());
    }
  }

  loadData(storageSpace: string, storageKey: string, callback: StorageLoadDataCallback): void {
    let localStorageKey = storageSpace + '.' + storageKey;
    try {
      let data = localStorage.getItem(localStorageKey);
      callback(true, data);
    } catch (e) {
      callback(false, e.toString());
    }
  }

  release() {
    // nothing to release
  }

}

