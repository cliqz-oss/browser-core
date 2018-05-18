/**
 * @module core
 * @submodule core.persistence
 * @namespace core
 */

/**
 * Helper class for a batch response from pouch db
 *
 * @class DocumentBatch
 */
export default class DocumentBatch {
  /**
   * @constructor
   * @param {object} db
   */
  constructor(db, docs) {
    this.db = db;
    this.docs = docs;
  }

  /**
   * Get the raw documents from this batch
   *
   * @method getDocs
   * @returns {Object[]}
   */
  getDocs() {
    return this.docs.rows.map(row => row.doc);
  }

  /**
   * Get rows returned from query
   *
   * @method getRows
   * @returns {Object[]}
   */
  getRows() {
    return this.docs.rows;
  }

  /**
   * Delete all the rows in this batch from the database
   * @method delete
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
