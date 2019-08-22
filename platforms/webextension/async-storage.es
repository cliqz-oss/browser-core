/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from './globals';
import MemoryAsyncStorage from '../core/helpers/memory-async-storage';

class ChromeAsyncStorage {
  constructor(storageArea) {
    this.storage = storageArea;
  }

  async _storageAPIRequest(fn, ...args) {
    return new Promise((resolve, reject) => {
      this.storage[fn](...args, (result) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        return resolve(result);
      });
    });
  }

  async getItem(key) {
    return (await this._storageAPIRequest('get', key))[key];
  }

  async setItem(key, value) {
    return this._storageAPIRequest('set', {
      [key]: value,
    });
  }

  async removeItem(key) {
    return this._storageAPIRequest('remove', key);
  }

  async mergeItem(key, value) {
    const current = await this.getItem(key);
    const merged = {
      ...JSON.parse(current),
      ...JSON.parse(value),
    };
    return this.setItem(key, merged);
  }

  async getAllKeys() {
    const allItems = await this._storageAPIRequest('get', null);
    return Object.keys(allItems);
  }

  async multiGet(keys) {
    const values = await this._storageAPIRequest('get', keys);
    return Object.keys(values).map(k => [k, values[k]]);
  }

  async multiSet(keyValuePairs) {
    const values = keyValuePairs.reduce((map, kv) => Object.assign(map, { [kv[0]]: kv[1] }), {});
    return this._storageAPIRequest('set', values);
  }

  async multiRemove(keys) {
    return this._storageAPIRequest('remove', keys);
  }
}

export default (chrome && chrome.storage && chrome.storage.local)
  ? new ChromeAsyncStorage(chrome.storage.local)
  : MemoryAsyncStorage;
