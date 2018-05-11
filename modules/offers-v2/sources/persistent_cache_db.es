/*
 * This module will provide an interface for saving / loading persistent data.
 *
 */
import logger from './common/offers_v2_logger';
import DBHelper from './db_helper';
import { utils } from '../core/cliqz';
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
   * @param {object} [db] The database to be wrapped into the DBHelper
   * @param {string} [docName] The docname to be used for storing the doc on the db
   * @param {Object} [config] as follow:
   *
   * configs: {
   *   // if we should persist / load the data from disk
   *   should_persist: true,
   *   // autosave time freq seconds, 0 means do not autosave
   *   autosave_freq_secs: N,
   *   // old entries delta time in seconds used to remove all entries that
   *   // (now - last_update_timesamp) > old_entries_dt_secs.
   *   old_entries_dt_secs: Z
   * }
   *
   */
  constructor(db, docName, configs) {
    this.db = new DBHelper(db);
    this.docName = docName;
    this.configs = configs;
    this.dbDirty = false;
    this.entries = {};
    if (configs && configs.autosave_freq_secs > 0) {
      this.autosaveTimer = utils.setInterval(() => {
        if (this.dbDirty) {
          this.saveEntries();
        }
      }, configs.autosave_freq_secs * 1000);
    }
  }

  destroy() {
    if (this.autosaveTimer) {
      utils.clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * will save the current entries if dirty
   * @param {boolean} [force] will override the configs.should_persist flag
   * @return a promise resolving to true on success | false otherwise
   */
  saveEntries(force = false) {
    if (!this.db || !this.docName) {
      logger.warn('saveEntries: no db set or no doc set?');
      return Promise.resolve(false);
    }
    if (!force && !this.configs.should_persist) {
      // nothing to do
      return Promise.resolve(true);
    }

    // is dirty?
    if (!this.dbDirty) {
      return Promise.resolve(true);
    }

    const self = this;
    self._removeOldEntries();
    return this.db.saveDocData(this.docName, { entries: this.entries }).then(() => {
      self.dbDirty = false;
      return Promise.resolve(true);
    });
  }

  /**
   * will reload the entries
   * @param {boolean} [force] will override the configs.should_persist flag
   * @return {[type]} [description]
   */
  loadEntries(force = false) {
    if (!this.db || !this.docName) {
      logger.warn('loadEntries: no db set or no doc set?');
      return Promise.resolve(false);
    }
    if (!force && !this.configs.should_persist) {
      // nothing to do
      return Promise.resolve(true);
    }

    const self = this;
    return self.db.getDocData(this.docName).then((docData) => {
      if (!docData || !docData.entries) {
        logger.error('loadEntries: something went wrong loading the data?');
        return Promise.resolve(false);
      }

      // set the data
      self.entries = docData.entries;
      self._removeOldEntries();

      // db is not dirty anymore
      self.dbDirty = false;

      return Promise.resolve(true);
    }).catch((err) => {
      logger.error(`loadEntries: error loading the storage data...: ${JSON.stringify(err)}`);
      Promise.resolve(false);
    });
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
    let cont = this.entries[eid];
    if (!cont) {
      cont = this.entries[eid] = this._createContainer();
    }
    cont.data = data;

    // cont.l_u_ts = timestampMS(); // this will be called on markEntryDirty
    this.markEntryDirty(eid);


    return true;
  }

  /**
   * will return the entry data if any, null / undefined if not exists
   * @param  {[type]} eid [description]
   * @return {[type]}     [description]
   */
  getEntryData(eid) {
    if (!eid) {
      return null;
    }
    const cont = this.entries[eid];
    return cont ? cont.data : null;
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
    if (!eid) {
      return null;
    }
    return this.entries[eid];
  }

  /**
   * mark an entry as dirty and ifupdateLUTS == True then update the last_update
   * timestamp of the container
   * @param  {[type]} eid [description]
   * @param  {[type]} updateLUTS [description]
   * @return {[type]}     [description]
   */
  markEntryDirty(eid, updateLUTS = true) {
    // for now we will do a basic all at once since we cannot save entries separately
    if (!eid) {
      return;
    }
    const cont = this.entries[eid];
    if (!cont) {
      return;
    }
    if (updateLUTS) {
      cont.l_u_ts = timestampMS();
    }
    this.dbDirty = true;
  }

  _removeOldEntries() {
    if (!this.configs || this.configs.old_entries_dt_secs <= 0) {
      return;
    }
    const now = timestampMS();
    let isDirty = false;
    Object.keys(this.entries).forEach((ek) => {
      const entry = this.entries[ek];
      if (!entry) {
        return;
      }
      // check the entry delta time
      const dt = now - entry.l_u_ts;
      if (dt >= this.configs.old_entries_dt_secs) {
        delete this.entries[ek];
        isDirty = true;
      }
    });
    if (isDirty) {
      this.dbDirty = true;
    }
  }

  _createContainer() {
    const now = timestampMS();
    return {
      c_ts: now,
      l_u_ts: now
    };
  }
}
