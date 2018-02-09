/*
 * This module will provide an interface for saving / loading persistent data.
 *
 */

import logger from './common/offers_v2_logger';

export default class DBHelper {

  //
  // @brief constructor
  // @param db  the database instance to use (pouchdb)
  //
  constructor(db) {
    this.db = db;
  }

  saveDocData(docID, docData) {
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

  getDocData(docID) {
    return this.db.get(docID)
      .then(doc => (doc.doc_data))
      .catch((err) => {
        logger.log(`getDocData: error getting doc ${docID} with err: ${err}`);
        return null;
      });
  }

  removeDocData(docID) {
    // https://pouchdb.com/api.html#delete_document
    const self = this;
    return self.db.get(docID).then((doc) => {
      logger.log(`removeDocData: removing doc ${docID}`);
      return self.db.remove(doc);
    }).then(() => {
      // nothing to do
      logger.log(`removeDocData: doc ${docID} removed properly`);
    }).catch((err) => {
      // nothing to do there
      logger.log(`removeDocData: something happened removing the doc: ${docID} - err: ${err}`);
    });
  }
}
