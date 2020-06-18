/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import { fetch } from '../core/http';
import { fromBase64 } from '../core/encoding';
import { getTimeAsYYYYMMDD } from './timestamps';

function isYYYYMMDD(date) {
  return typeof date === 'string' && /^[0-9]{8}$/.test(date);
}

export default class ServerPublicKeyAccessor {
  constructor({ config, storage, storageKey }) {
    // Note: do not go through proxies when fetching keys; otherwise,
    // the proxy could replace it, and the key exchange would be insecure.
    this.hpnCollector = config.HUMAN_WEB_LITE_COLLECTOR_DIRECT;
    this.storage = storage;
    this.storageKey = storageKey;
    this._knownKeys = new Map();
  }

  async getKey(today = getTimeAsYYYYMMDD()) {
    if (!this._knownKeys.get(today)) {
      if (!this._pending) {
        this._pending = this._updateCache(today);
        this._pending.catch(() => {}).then(() => { this._pending = null; });
      }
      await this._pending;
    }
    const key = this._knownKeys.get(today);
    if (key) {
      return { date: today, publicKey: key.imported };
    }
    // did not get anything after refreshing the cache -> give up
    throw new Error(`No server's public key was found for today=${today}`);
  }

  async _updateCache(today) {
    // try to load from disk
    let knownKeys;
    try {
      const keysFromDisk = await this.storage.get(this.storageKey).catch(() => null);
      if (keysFromDisk && keysFromDisk.some(([date]) => date === today)) {
        logger.debug('Server keys on disk are still valid');
        knownKeys = await this.importAndVerifyPubKeys(keysFromDisk);
      } else {
        logger.info('Server keys on disk need to be refetched. Expected:', today);
      }
    } catch (e) {
      logger.warn(`Ignoring corrupted server keys (storageKey: ${this.storageKey}). Reload from network.`, e);
    }

    // not found on disk or outdated -> fetch from server
    if (!knownKeys) {
      const url = `${this.hpnCollector}/config?fields=pubKeys`;
      logger.info('Fetching new server public keys from', url);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'manual',
      });
      if (!response.ok) {
        throw new Error(`Failed to get config (${response.statusText}) from url=${url}`);
      }
      const { pubKeys } = await response.json();
      logger.info('Fetched server public keys:', pubKeys);

      const allKeys = Object.keys(pubKeys)
        .filter(isYYYYMMDD)
        .map(date => [date, fromBase64(pubKeys[date])]);
      knownKeys = await this.importAndVerifyPubKeys(allKeys);

      // update disk cache
      try {
        const entry = [...knownKeys].map((date, { key }) => [date, key]);
        await this.storage.set(this.storageKey, entry);
      } catch (e) {
        logger.warn('Failed to cache server keys to disk.', e);
      }
    }

    this._knownKeys = knownKeys;
  }

  async importAndVerifyPubKeys(allKeys) {
    return new Map(await Promise.all(
      allKeys.map(async ([date, key]) => {
        const imported = await crypto.subtle.importKey(
          'raw',
          key,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        );
        return [date, { key, imported }];
      })
    ));
  }
}
