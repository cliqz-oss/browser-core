/* global emit */

import Database from '../database';
import DocumentBatch from './document-batch';

/**
 * A persistent Queue which maintains element ordering by provided
 * sort keys. Supports element query from both ends.
 * @namespace core/persistence
 * @class OrderedQueue
 */
export default class {

  constructor(name) {
    this.db = new Database(name, { auto_compaction: true });
    // create index on sort field
    const ddoc = {
      _id: '_design/sorted',
      views: {
        ascending: {
          map: function sort(doc) { emit(doc.sort); }.toString()
        }
      }
    };
    this.db.put(ddoc);
  }

  /**
   * Add a value to the queue with the specified sort value.
   * If key already exists in the queue, this is a noop. Setting `overwrite` to
   * true overrides this behaviour.
   * @param {String} key
   * @param {Any}    sortValue
   * @param {Bool}   overwrite (optional) default false
   */
  offer(key, sortValue, overwrite = false) {
    return this.db.get(key).catch((err) => {
      if (err.name === 'not_found') {
        return {
          _id: key,
        };
      }
      throw err;
    })
    .then((doc) => {
      if (overwrite || !doc._rev) {
        return this.db.put(Object.assign(doc, { sort: sortValue }));
      }
      return Promise.resolve(doc);
    });
  }

  length() {
    // doc count will be one more than queue length due to design doc
    return this.db.info().then(stats => Math.max(stats.doc_count - 1, 0));
  }

  /**
   * Fetch entries from the queue (in order)
   * @param {Object} opts Options to query:
   *    - `limit` limit maximum number of results
   *    - `descending` to reverse ordering
   *    - `startKey` and `endKey` to filter between sort values
   * @returns {Promise<DocumentBatch>} batch of documents containing `key` and `sort` objects
   */
  peek(opts) {
    const options = Object.assign({
      include_docs: true,
    }, opts);
    return this.db.query('sorted/ascending', options).then(docs => new DocumentBatch(this.db, docs));
  }

  /**
   * Fetch and remove entries from the queue
   * @param {Objects} opts Query options (see peek)
   * @returns {Promise<DocumentBatch>}
   */
  drain(opts) {
    return this.peek(opts).then(batch => (
      batch.delete().then(() => Promise.resolve(batch))
    ));
  }

}
