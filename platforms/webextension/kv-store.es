/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint import/no-mutable-exports: 'off' */

import Dexie from '@cliqz-oss/dexie';
import { chrome } from './globals';
import console from '../core/console';
import { toBase64, fromBase64 } from '../core/encoding';
import platform from './platform';

// can we write binary data directly to chrome.storage?
const binaryStorageSupported = platform.isFirefox;
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
            try {
              // perform a base64 decode for values we encoded before write (see `set`)
              const value = !binaryStorageSupported && key.endsWith('.bin') ? fromBase64(res[key]) : res[key];
              resolve(value);
            } catch (decodeError) {
              reject(decodeError);
            }
          } else {
            reject(new Error(`storage has no value for ${key}`));
          }
        });
      });
    },
    set(key, value) {
      return new Promise((resolve, reject) => {
        // a storage key ending with '.bin' indicates we should treat this as an ArrayBuffer.
        // Only Firefox supports directly writing an ArrayBuffer to chrome.storage, so for other
        // platforms we use base 64 encoding to safely storage it.
        chrome.storage.local.set(
          { [key]: !binaryStorageSupported && key.endsWith('.bin') ? toBase64(value) : value },
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
