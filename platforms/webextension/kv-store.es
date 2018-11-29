/* eslint import/no-mutable-exports: 'off' */

import Dexie from '@cliqz-oss/dexie';
import { chrome } from './globals';
import console from '../core/console';

let storage = {};

try {
  const db = new Dexie('cliqz-kv-store');
  db.version(1).stores({ kv: 'key' });
  storage = {
    get(key) {
      return db.kv.get(key).then(result => result.value);
    },

    set(key, value) {
      return db.kv.put({ key, value });
    },

    remove(key) {
      return db.kv.delete(key);
    }
  };
} catch (e) {
  // unalble to load indexeddb
  storage = {
    get(key) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (res) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else if (res[key]) {
            resolve(res[key]);
          } else {
            reject(new Error(`storage has no value for ${key}`));
          }
        });
      });
    },
    set(key, value) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(
          { [key]: value },
          () => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          }
        );
      });
    },
    remove(key) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    },
  };
}

export default storage;
