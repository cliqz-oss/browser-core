import Database from '../core/database';
import logger from './common/logger';

/**
 * Using PouchDB
 */
class DataAccessProvider {
  constructor() {
    this.db = new Database('market-analysis', { revs_limit: 1, auto_compaction: true });
    this.STORAGE_KEY = 'webstats';

    this.db.info().then((info) => {
      logger.log(`Current Database Info: ${JSON.stringify(info)}`);
    });
  }

  /**
  * load MATable from local storage database
  * @param  {Function} callback - callback function
  */
  loadMATable(callback) {
    this._getDocData(this.STORAGE_KEY).then((docData) => {
      if (!docData) {
        logger.log(`Warning: ${this.STORAGE_KEY} does not exist`);
      }
      callback(docData);
    });
  }

  /**
  * save MATable to local storage database
  * @param  {Object} maTable MATable
  */
  saveMATable(maTable) {
    if (!maTable) {
      logger.log('Skipping the load of storage data');
      return;
    }
    this._saveDocData(this.STORAGE_KEY, maTable);
  }

  removeMATable() {
    this._removeDocData(this.STORAGE_KEY);
  }

  _saveDocData(docID, docData) {
    const self = this;
    return this.db.get(docID)
      .catch(() => ({ _id: docID, doc_data: {} }))
      .then((data) => {
        const doc = Object.assign({}, data, {
          doc_data: Object.assign({}, data.doc_data, docData),
        });
        return self.db.put(doc);
      });
  }

  _getDocData(docID) {
    return this.db.get(docID)
      .then(doc => (doc.doc_data))
      .catch((err) => {
        logger.debug(`Error getting doc ${docID} with err: ${err}`);
        return null;
      });
  }

  _removeDocData(docID) {
    const self = this;
    return self.db.get(docID).then((doc) => {
      logger.debug(`Removing doc ${docID}`);
      return self.db.remove(doc);
    }).then(() => {
      // nothing to do
      logger.debug(`Doc ${docID} removed properly`);
    }).catch((err) => {
      // nothing to do there
      logger.error(`Something happened removing the doc: ${docID} - err: ${err}`);
    });
  }

}

export default DataAccessProvider;
