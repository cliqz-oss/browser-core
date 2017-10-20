/**
 * This file will contain some helper classes to handle persistent state /
 * information.
 */

import logger from './logger';


// /////////////////////////////////////////////////////////////////////////////
// Data handler / holder abstraction
//
export class BasicDataHolder {
  constructor(docID, data, db) {
    this.docID = docID;
    this.d = data;
    this.db = db;
  }
  destroy() {}
  save() { return Promise.resolve(true); }
  load() { return Promise.resolve(true); }
  markDataDirty() {}
  erase() { return Promise.resolve(true); }
  get data() { return this.d; }
  set data(d) { this.d = d; }
}

export class PersistentDataHandler extends BasicDataHolder {
  constructor(docID, data, db) {
    super(docID, data, db);
    this.dataDirty = false;
  }

  destroy() {
    return this.save();
  }

  save(force = false) {
    if (!force && !this.dataDirty) {
      return Promise.resolve(true);
    }
    return this.db.upsert(this.docID, { data: this.d }).then(() => {
      logger.log('data saved successfully');
      this.dataDirty = false;
      return Promise.resolve(true);
    });
  }

  load() {
    return this.db.get(this.docID).then((docData) => {
      if (!docData || !docData.data) {
        logger.error('load data from DB: something went wrong loading the data?');
        return Promise.resolve(false);
      }

      // set the data
      this.d = docData.data;
      this.dataDirty = false;
      return Promise.resolve(true);
    }).catch((err) => {
      logger.error('load: error loading the storage data...:', err);
      return Promise.resolve(false);
    });
  }

  markDataDirty() {
    this.dataDirty = true;
  }

  erase() {
    return this.db.remove(this.docID);
  }
}
