/* eslint no-param-reassign: 'off' */

import * as datetime from '../time';
import md5 from '../../core/helpers/md5';
import console from '../../core/console';

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
  constructor(qsWhitelist, config, db) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.db = db;
    this.hashTokens = true;
    this.requestKeyValue = new Map();
    this._syncTimer = null;
    this._lastPrune = null;
    this._currentDay = null;
  }

  init() {
    return this.loadAndPrune();
  }

  unload() {
    if (this._syncTimer) {
      clearTimeout(this._syncTimer);
    }
  }

  clearCache() {
    this.requestKeyValue.clear();
    return this.db.requestKeyValue.clear();
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
    if (!state.isPrivate && this.qsWhitelist.isTrackerDomain(state.urlParts.generalDomainHash)) {
      const today = this.currentDay;

      const tracker = state.urlParts.generalDomainHash;

      // create a Map of key => set(values) from the url data
      const cachedKvs = this.requestKeyValue.get(tracker) || new Map();
      const reachedThreshold = new Set();
      const kvs = state.urlParts.getKeyValues().reduce((hash, kv) => {
        if (kv.v.length < this.config.shortTokenLength
          || this.qsWhitelist.isSafeKey(tracker, md5(kv.k))) {
          return hash;
        }
        const key = this.hashTokens ? md5(kv.k) : kv.k;
        const tok = this.hashTokens ? md5(kv.v) : kv.v;
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
            this.config.safekeyValuesThreshold
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

  pruneDb() {
    const cutoff = this.getPruneCutoff();
    return this.db.requestKeyValue.where('day').below(cutoff).delete().then(() => {
      this._lastPrune = this.currentDay;
    });
  }

  loadAndPrune() {
    return this.pruneDb();
  }

  _scheduleSync(prune) {
    if (this._syncTimer) {
      return;
    }
    this._syncTimer = setTimeout(() => {
      const maybePrune = prune ? this.pruneDb() : Promise.resolve();
      maybePrune.then(() => this._syncDb());
      this._syncTimer = null;
    }, 10000);
  }

  _syncDb() {
    const rows = [];
    const trackerKeys = [];
    for (const [tracker, keys] of this.requestKeyValue.entries()) {
      for (const [key, tokens] of keys.entries()) {
        if (tokens.dirty) {
          tokens.items.forEach((day, value) => {
            rows.push({
              tracker,
              key,
              value,
              day,
            });
          });
          trackerKeys.push({ tracker, key });
          tokens.setDirty(false);
        }
      }
    }
    return this.db.requestKeyValue.bulkPut(rows).catch((errors) => {
      console.error('requestKeyValue', 'bulkPut errors', errors);
    }).then(() =>
      trackerKeys.map(({ tracker, key }) =>
        this.db.requestKeyValue.where('[tracker+key]').equals([tracker, key]).count((tokenCount) => {
          if (tokenCount > this.config.safekeyValuesThreshold) {
            if (this.config.debugMode) {
              console.log('Add safekey', tracker, key);
            }
            this.qsWhitelist.addSafeKey(
              tracker,
              this.hashTokens ? key : md5(key),
              tokenCount
            );
          }
          this.removeRequestKeyValueEntry(tracker, key);
        }).catch(e => console.error(e))));
  }
}
