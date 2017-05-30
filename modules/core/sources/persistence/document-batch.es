/**
 * Helper class for a batch response from pouch db
 * @namespace core/persistence
 * @class DocumentBatch
 */
export default class DocumentBatch {

  constructor(db, docs) {
    this.db = db;
    this.docs = docs;
  }

  /**
   * Get the raw documents from this batch
   * @returns {Array<Object>}
   */
  getDocs() {
    return this.docs.rows.map(row => row.doc);
  }

  /**
   * Get rows returned from query
   * @returns {Array<Object>}
   */
  getRows() {
    return this.docs.rows;
  }

  /**
   * Delete all the rows in this batch from the database
   * @returns {Promise}
   */
  delete() {
    const deleteDocs = this.docs.rows.map(row => ({
      _id: row.doc._id,
      _rev: row.doc._rev,
      _deleted: true,
    }));
    return this.db.bulkDocs(deleteDocs);
  }
}
