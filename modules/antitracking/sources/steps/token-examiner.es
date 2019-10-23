/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import * as datetime from '../time';
import md5, { truncatedHash } from '../../core/helpers/md5';
import console from '../../core/console';
import pacemaker from '../../core/services/pacemaker';

class TokenSet {
  constructor() {
    this.items = new Map();
    this.dirty = false;
  }

  add(tok, value) {
    this.items.set(tok, value);
    this.dirty = true;
  }

  size() {
    return this.items.size;
  }

  toObject() {
    const obj = {};
    this.items.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  setDirty(val) {
    this.dirty = val;
  }
}

/**
 * Manages the local safekey list
 */
export default class TokenExaminer {
  constructor(qsWhitelist, config, db, shouldCheckToken) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.shouldCheckToken = shouldCheckToken;
    this.hashTokens = true;
    this.requestKeyValue = new Map();
    this._syncTimer = null;
    this._lastPrune = null;
    this._currentDay = null;
    this._cleanLegacyDb = db.requestKeyValue.clear();
  }

  init() {
    return this._cleanLegacyDb;
  }

  unload() {
    pacemaker.clearTimeout(this._syncTimer);
    this._syncTimer = null;
  }

  clearCache() {
    this.requestKeyValue.clear();
    return Promise.resolve();
  }

  addRequestKeyValueEntry(tracker, key, tokens) {
    if (!this.requestKeyValue.has(tracker)) {
      this.requestKeyValue.set(tracker, new Map());
    }
    const trackerMap = this.requestKeyValue.get(tracker);
    if (!trackerMap.has(key)) {
      trackerMap.set(key, new TokenSet());
    }
    const toks = trackerMap.get(key);
    Object.keys(tokens).forEach((tok) => {
      toks.add(tok, tokens[tok]);
    });
    return toks;
  }

  removeRequestKeyValueEntry(tracker, key) {
    const trackerMap = this.requestKeyValue.get(tracker);
    if (trackerMap) {
      trackerMap.delete(key);
    }
    if (trackerMap && trackerMap.size === 0) {
      this.requestKeyValue.delete(tracker);
    }
  }

  get currentDay() {
    if (!this._currentDay || Date.now() > this._nextDayCheck) {
      const day = datetime.getTime().substr(0, 8);
      if (day !== this._currentDay) {
        this._nextDayCheck = Date.now() + (3600 * 1000);
      }
      this._currentDay = day;
    }
    return this._currentDay;
  }

  examineTokens(state) {
    // do not do anything for private tabs and non-tracker domains
    if (!state.isPrivate
        && this.qsWhitelist.isTrackerDomain(truncatedHash(state.urlParts.generalDomain))) {
      const today = this.currentDay;

      const tracker = truncatedHash(state.urlParts.generalDomain);

      // create a Map of key => set(values) from the url data
      const cachedKvs = this.requestKeyValue.get(tracker) || new Map();
      const reachedThreshold = new Set();
      const kvs = state.urlParts.extractKeyValues().params.reduce((hash, kv) => {
        const [k, v] = kv;
        if (!this.shouldCheckToken(v)) {
          return hash;
        }
        const key = this.hashTokens ? md5(k) : k;
        if (this.qsWhitelist.isSafeKey(tracker, key)) {
          return hash;
        }
        const tok = this.hashTokens ? md5(v) : v;
        if (!hash.has(key)) {
          hash.set(key, new TokenSet());
        }
        hash.get(key).add(tok, today);
        // whitelist any keys which reached the threshold
        if (!reachedThreshold.has(key)
            && hash.get(key).size() > this.config.safekeyValuesThreshold) {
          reachedThreshold.add(key);
          if (this.config.debugMode) {
            console.log('Add safekey', state.urlParts.generalDomain, key, hash.get(key));
          }
          this.qsWhitelist.addSafeKey(
            tracker,
            this.hashTokens ? key : md5(key),
            this.config.safekeyValuesThreshold,
          );
        }
        return hash;
      }, cachedKvs);

      // push updated cache
      this.requestKeyValue.set(tracker, kvs);
      this._scheduleSync(today !== this._lastPrune);
      return true;
    }
    return true;
  }

  getPruneCutoff() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - this.config.safeKeyExpire);
    return datetime.dateString(day);
  }

  _scheduleSync() {
    if (this._syncTimer) {
      return;
    }
    this._syncTimer = pacemaker.setTimeout(async () => {
      try {
        await this._syncDb();
      } finally {
        this._syncTimer = null;
      }
    }, 20000);
  }

  async _syncDb() {
    const cutoff = this.getPruneCutoff();
    for (const [tracker, keys] of this.requestKeyValue.entries()) {
      for (const [key, tokens] of keys.entries()) {
        tokens.items.forEach((day, value) => {
          if (day < cutoff) {
            tokens.items.delete(value);
          }
        });
        tokens.setDirty(false);
        if (tokens.size() > this.config.safekeyValuesThreshold
            && !this.qsWhitelist.isSafeKey(tracker, key)) {
          this.qsWhitelist.addSafeKey(tracker, this.hashTokens ? key : md5(key), tokens.size());
          this.removeRequestKeyValueEntry(tracker, key);
        }
      }
    }
  }
}
