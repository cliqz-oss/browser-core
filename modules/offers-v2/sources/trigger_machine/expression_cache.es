import { timestampMS } from '../utils';


export default class ExpressionCache {
  /**
   * constructor
   * @return {[type]}            [description]
   */
  constructor() {
    this.cache = new Map();
  }

  destroy() {
    // nothing to do
  }

  addEntry(expID, ttlSecs, val) {
    if (!expID || !ttlSecs) {
      return;
    }
    const expTs = timestampMS() + (ttlSecs * 1000);
    this.cache.set(expID, { expirate_ts: expTs, data: val });
  }

  hasEntry(expID) {
    return this._expireCacheEntry(expID);
  }

  getEntry(expID) {
    if (!this._expireCacheEntry(expID)) {
      return null;
    }
    return this.cache.get(expID).data;
  }

  _expireCacheEntry(expID) {
    if (!this.cache.has(expID)) {
      return false;
    }
    const elem = this.cache.get(expID);
    const now = timestampMS();
    if (elem.expirate_ts < now) {
      this.cache.delete(expID);
      return false;
    }
    return true;
  }
}
