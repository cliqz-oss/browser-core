/*
 * This module will provide an interface for saving / loading persistent data.
 *
 */
import { buildCachedMap } from './common/cached-map-ext';
import { timestampMS } from './utils';


/**
 * This class will be used to store different entries on a common DB doc name
 * with the following functionalities:
 * - possibility of add entries with particular keys (with any type of data).
 * - automatic track of last update / created of each entry.
 * - autosave entries after a given period of time if the doc is dirty.
 * - automatic removal of old entries given a delta time frame.
 *
 * @note It is important to note that we will share the reference that is returned
 * so whatever it happens outside of this class that modifies the entry should
 * be notified over markEntryDirty(eid);
 *
 * The layout is something like:
 * doc_id: {
 *   entrie_id_1: {
 *     c_ts: X, // the created timestamp,
 *     l_u_ts: Y, // the last update of the entry (timestamp)
 *     d: {
 *       // whatever the data you want to store for the entrie
 *     }
 *   }
 * }
 */
export default class PersistentCacheDB {
  /**
   * @param {object} [db] The database to be wrapped into the SimpleDB
   * @param {string} [docName] The docname to be used for storing the doc on the db
   * @param {Object} [config] as follow:
   *
   * configs: {
   *   // if we should persist / load the data from disk
   *   should_persist: true,
   *   // old entries delta time in seconds used to remove all entries that
   *   // (now - last_update_timesamp) > old_entries_dt_secs.
   *   old_entries_dt_secs: Z
   * }
   *
   */
  constructor(docName, configs) {
    this.entriesMap = buildCachedMap(docName, configs.should_persist);
    this.configs = configs;
  }

  /**
   * will reload the entries
   */
  loadEntries() {
    return this.entriesMap.init().then(() => this._removeOldEntries);
  }

  /**
   * will set a new entry on the list, will also make it as dirty and update the
   * last update time (l_u_ts).
   * @param {string} eid  entry id
   * @param {anything that can be stored} data entry data
   */
  setEntryData(eid, data) {
    if (!eid) {
      return false;
    }
    const cont = this.entriesMap.get(eid) || this._createContainer();
    cont.data = data;
    cont.l_u_ts = timestampMS();
    this.entriesMap.set(eid, cont);
    return true;
  }

  /**
   * will return the entry data if any, null / undefined if not exists
   * @param  {[type]} eid [description]
   * @return {[type]}     [description]
   */
  getEntryData(eid) {
    return this.entriesMap.has(eid) ? this.entriesMap.get(eid).data : null;
  }

  /**
   * will return the container of the entry if exists
   * {
   *   c_ts: (created timestamp),
   *   l_u_ts: (last updated timestamp),
   *   data: (object data)
   * }
   * @return {[type]} [description]
   */
  getEntryContainer(eid) {
    return this.entriesMap.has(eid) ? this.entriesMap.get(eid) : null;
  }

  _removeOldEntries() {
    if (!this.configs || this.configs.old_entries_dt_secs <= 0) {
      return;
    }
    const now = timestampMS();
    this.entriesMap.keys().forEach((ek) => {
      const entry = this.entriesMap.get(ek);
      if (!entry) {
        return;
      }
      // check the entry delta time
      const dtSecs = (now - entry.l_u_ts) / 1000;
      if (dtSecs >= this.configs.old_entries_dt_secs) {
        this.entriesMap.delete(ek);
      }
    });
  }

  _createContainer() {
    const now = timestampMS();
    return {
      c_ts: now,
      l_u_ts: now
    };
  }
}
