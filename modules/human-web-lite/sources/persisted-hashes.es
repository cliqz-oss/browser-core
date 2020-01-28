/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * From time to time, we need to iterate through all keys
 * to actively remove expired ones.
 */
const DEFAULT_PRUNE_INTERVAL = 6 * HOUR;

/**
 * This should be so high that under normal operations
 * it must be impossible to reach.
 */
const THRESHOLD_TO_RESET_ALL_KEYS = 50000;

function isExpired(ts) {
  return Date.now() >= ts;
}

export default class PersistedHashes {
  constructor({ storage, storageKey }) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.entries = new Map();
    this.nextPrune = 0;

    this._pending = null;
    this._dirty = false;
  }

  async _ready() {
    if (!this._pending) {
      this._pending = this._loadFromDisk().catch((e) => {
        logger.info('Could not restore previous state. It is normal to see this message on a new profile.', e);
      });
    }
    await this._pending;
    this._expireOldEntries();
  }

  async has(key) {
    await this._ready();

    const value = this.entries.get(key);
    if (!value) {
      return false;
    }
    if (isExpired(value)) {
      this.entries.delete(key);
      this._dirty = true;
      return false;
    }
    return true;
  }

  async add(key, expireAt) {
    if (!Number.isInteger(expireAt)) {
      throw new Error(`Bad expiredAt timestamp: ${expireAt}`);
    }
    await this._ready();

    const oldMapping = this.entries.get(key);
    if (oldMapping && !isExpired(oldMapping)) {
      // key did already exist
      return false;
    }

    // This case should never be reached. It indicates that we
    // either write far more hashes then expected, or that we
    // fail to clean them up. If the map gets too big, it will start to
    // slow down the application. To protect against that possibility,
    // expire all previous keys.
    if (this.entries.size >= THRESHOLD_TO_RESET_ALL_KEYS) {
      logger.error('The hashes on the profile ran full. Purging now to prevent performance impacts.');
      this.entries.clear();
    }

    this.entries.set(key, expireAt);
    this._dirty = true;

    // Be more aggressive with flushing add operation, which
    // is the critical operation. False negatives (lost delete options)
    // are typically harmless as they will only lead to retry updates
    // being skipped.
    setTimeout(() => {
      this.flush();
    }, 0);

    // key did not exist before
    return true;
  }

  async delete(key) {
    await this._ready();

    if (this.entries.delete(key)) {
      this._dirty = true;
      return true;
    }
    return false;
  }

  async clear() {
    await this._ready();

    if (this.entries.size > 0) {
      this.entries.clear();
      this._dirty = true;
    }
  }

  async flush() {
    await this._ready();

    this._pending = this._pending.then(async () => {
      if (this._dirty) {
        await this._persist();
      }
    }).catch(() => {});
    await this._pending;
  }

  async _loadFromDisk() {
    const values = await this.storage.get(this.storageKey);
    if (values) {
      const { nextPrune, hashes } = values;
      if (!Number.isInteger(nextPrune)) {
        throw new Error(`Corrupted nextPrune: ${nextPrune}`);
      }
      if (!Array.isArray(hashes)) {
        throw new Error(`Corrupted hashes: ${hashes}`);
      }

      this.entries = new Map(hashes);
      this.nextPrune = nextPrune;
      this._dirty = false;
    }
  }

  async _persist() {
    this._dirty = false;
    await this.storage.set(this.storageKey, {
      hashes: [...this.entries],
      nextPrune: this.nextPrune,
      version: 1,
    });
  }

  _expireOldEntries() {
    const now = Date.now();
    if (now >= this.nextPrune) {
      const oldSize = this.entries.size;
      this.entries = new Map([...this.entries].filter(([, expireAt]) => expireAt > now));
      logger.info('cleanup:', oldSize - this.entries.size, 'hashes have expired');
      this.nextPrune = now + DEFAULT_PRUNE_INTERVAL;
      this._dirty = true;

      setTimeout(() => {
        this.flush();
      }, 0);
    }
  }
}
