import * as datetime from '../time';
import md5 from '../md5';
import Database from '../../core/database';
import console from '../../core/console';
import SerialExecutor from '../../core/helpers/serial-executor';
import utils from '../../core/utils';
import pacemaker from '../pacemaker';

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
export default class {

  constructor(qsWhitelist, config) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.db = new Database('cliqz-attrack-request-key-value', { auto_compaction: true });
    this.hashTokens = true;
    this.queue = new SerialExecutor();
    this.requestKeyValue = new Map();
    this._syncTimer = null;
    this.lastLoad = null;
    this._pmReload = null;
  }

  init() {
    return this.loadAndPrune().then(() => {
      this._pmReload = pacemaker.register(() => {
        if (this.lastLoad < datetime.dateString(datetime.newUTCDate())) {
          this.reloadCache();
        }
      }, 3600 * 1000);
    });
  }

  unload() {
    if (this._syncTimer) {
      utils.clearTimeout(this._syncTimer);
    }
    if (this._pmReload) {
      pacemaker.deregister(this._pmReload);
    }
  }

  clearCache() {
    this.requestKeyValue.clear();
    this.queue.enqueue(() => {
      return this.db.destroy().then(() => {
        this.db = new Database('cliqz-attrack-request-key-value', { auto_compaction: true });
      });
    });
  }

  reloadCache() {
    if (this._syncTimer) {
      utils.clearTimeout(this._syncTimer);
      this._syncTimer = null;
    }
    this._syncDb();
    this.queue.enqueue(() => {
      this.requestKeyValue.clear();
      return this.loadAndPrune();
    });
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

  examineTokens(state) {
    // do not do anything for private tabs and non-tracker domains
    if (!state.requestContext.isChannelPrivate() && this.qsWhitelist.isTrackerDomain(state.urlParts.generalDomainHash)) {
      const day = datetime.newUTCDate();
      const today = datetime.dateString(day);

      const tracker = state.urlParts.generalDomainHash;

      // create a Map of key => set(values) from the url data
      const cachedKvs = this.requestKeyValue.get(tracker) || new Map();
      const reachedThreshold = new Set();
      const kvs = state.urlParts.getKeyValues().filter(kv => (
        kv.v.length >= this.config.shortTokenLength && !this.qsWhitelist.isSafeKey(tracker, md5(kv.k))
      )).reduce((hash, kv) => {
        const key = this.hashTokens ? md5(kv.k) : kv.k;
        const tok = this.hashTokens ? md5(kv.v) : kv.v;
        if (!hash.has(key)) {
          hash.set(key, new TokenSet());
        }
        hash.get(key).add(tok, today);
        if (hash.get(key).size() > this.config.safekeyValuesThreshold) {
          reachedThreshold.add(key);
        }
        return hash;
      }, cachedKvs);

      // whitelist any keys which reached the threshold
      reachedThreshold.forEach((key) => {
        if (this.config.debugMode) {
          console.log('Add safekey', state.urlParts.generalDomain, key, kvs.get(key));
        }
        this.qsWhitelist.addSafeKey(tracker, this.hashTokens ? key : md5(key),
                                    this.config.safekeyValuesThreshold);
      });

      // push updated cache
      this.requestKeyValue.set(tracker, kvs);
      this._scheduleSync();
      return true;
    }
    return true;
  }

  getPruneCutoff() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - this.config.safeKeyExpire);
    return datetime.dateString(day);
  }

  /**
   * Prune old tokens and limit object to max 10 keys
   * @param  {Object} tokens
   * @param  {String} cutoff
   * @return {Object}
   */
  pruneTokens(tokens, cutoff) {
    let counter = 0;
    Object.keys(tokens).forEach((tok) => {
      if (counter > 10 || tokens[tok] < cutoff) {
        delete tokens[tok];
      } else {
        counter++;
      }
    });
    return tokens;
  }

  loadAndPrune() {
    this.lastLoad = datetime.dateString(datetime.newUTCDate());
    return this.db.allDocs({
      include_docs: true,
    }).then((results) => {
      const cutoff = this.getPruneCutoff();
      const docs = results.rows.map(row => row.doc).map((_d) => {
        const doc = _d;
        doc.tokens = this.pruneTokens(doc.tokens, cutoff);
        if (Object.keys(doc.tokens).length === 0) {
          doc._deleted = true;
        }
        return doc;
      });

      // pre-cache entries which are almost at the safekey threshold
      docs.filter(doc => Object.keys(doc.tokens).length === this.config.safekeyValuesThreshold - 1)
      .forEach((doc) => {
        const tracker = doc._id.substring(0, 16);
        const key = doc.key;
        this.addRequestKeyValueEntry(tracker, key, doc.tokens).setDirty(false);
      });
      // return updated docs
      return docs;
    }).then(docs => this.db.bulkDocs(docs));
  }

  _scheduleSync() {
    if (this._syncTimer) {
      return;
    }
    this._syncTimer = utils.setTimeout(() => {
      this._syncDb();
      this._syncTimer = null;
    }, 10000);
  }

  _syncDb() {
    const trackers = [...this.requestKeyValue.keys()];
    trackers.map(tracker => (
      [...this.requestKeyValue.get(tracker).entries()].filter(pair => pair[1].dirty)
    )).forEach((kvs, i) => {
      const tracker = trackers[i];
      if (kvs.length === 0) return;

      this._updateTrackerKeyValues(tracker, kvs);
      kvs.forEach(pair => pair[1].setDirty(false));
    });
  }

  _updateTrackerKeyValues(tracker, keyValuePairs) {
    const pruneCutoff = this.getPruneCutoff();
    const trackerHashLength = tracker.length;
    const unsafeKeysSeen = new Set(keyValuePairs.map(pair => pair[0]));
    const kvs = new Map();
    keyValuePairs.forEach(pair => kvs.set(pair[0], pair[1]));
    // Add upsert function to serial queue
    // this ensures multiple upserts do not conflict.
    this.queue.enqueue(() => (
      // query the db for keys for this tracker domain
      this.db.allDocs({
        include_docs: true,
        startkey: tracker,
        endkey: `${tracker}\uffff`,
      })
      // get rows for the keys we saw in this request
      .then(results => (
        results.rows.map(row => row.doc)
          .filter(row => unsafeKeysSeen.has(row._id.substring(trackerHashLength)))
      ))
      // update rows with new data
      .then((rows) => {
        const existingRowKeys = new Set(rows.map(doc => doc.key));
        // create documents for keys which weren't already in db
        const newDocs = Array.from(kvs.keys())
        .filter(key => !existingRowKeys.has(key))
        .map(key => (
          {
            _id: `${tracker}${key}`,
            key,
            tokens: kvs.get(key).toObject(),
          }
        ));
        // update existing documents with new tokens
        const updatedDocs = rows.map((_doc) => {
          const doc = _doc;
          doc.tokens = Object.assign(doc.tokens || {}, kvs.get(doc.key).toObject());
          // also prune while we're here
          doc.tokens = this.pruneTokens(doc.tokens, pruneCutoff);
          return doc;
        });

        const docs = newDocs.concat(updatedDocs);
        // get docs over threshold which should be added to safekey list
        docs.forEach((doc) => {
          const tokenCount = Object.keys(doc.tokens).length;

          if (tokenCount > this.config.safekeyValuesThreshold) {
            if (this.config.debugMode) {
              console.log('Add safekey', tracker, doc.key, doc.tokens);
            }
            this.qsWhitelist.addSafeKey(tracker, this.hashTokens ? doc.key : md5(doc.key),
                                        Object.keys(doc.tokens).length);
            // remove cached entry - it is not in safekey list
            this.removeRequestKeyValueEntry(tracker, doc.key);
          } else if (tokenCount > this.config.safekeyValuesThreshold - 1) {
            this.addRequestKeyValueEntry(tracker, doc.key, doc.tokens).setDirty(false);
          } else {
            this.removeRequestKeyValueEntry(tracker, doc.key);
          }
        });
        // upsert into the db
        return this.db.bulkDocs(docs);
      })
      .catch(e => console.error('requestKeyValue update error', e))
    ));
  }

}
