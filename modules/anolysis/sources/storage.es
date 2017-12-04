/* eslint no-underscore-dangle: off */
/* global emit */

import { utils } from '../core/cliqz';
import md5 from '../core/helpers/md5';
import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';
import PouchDB from '../core/database';


export default class {
  constructor(name) {
    this.database = new PouchDB(name, {
      revs_limit: 1,          // Don't keep track of all revisions of a document
      auto_compaction: true,  // Get rid of deleted revisions
    });

    this.buffer = [];

    // Flush database every 2 seconds
    this.flushInterval = utils.setInterval(
      () => this.flush(),
      2 * 1000,
    );
  }

  /**
   * Init the storage by adding the index if not already present.
   */
  init() {
    const designDoc = {
      _id: '_design/index',
      views: {
        by_ts: {
          map: `function map(doc) {
            emit(doc.ts);
          }`,
        },
      },
    };

    return this.info() // Call info to make sure the DB is initialized
      .then(() => this.database.put(designDoc))
      .then(() =>
        // Pre-build the index
        this.database.query('index/by_ts', {
          limit: 0,
        })
      )
      .catch(() => { /* Ignore if document already exists */ });
  }

  unload() {
    this.flush();
    utils.clearInterval(this.flushInterval);
  }

  flush() {
    if (this.buffer.length > 0) {
      return this.database.bulkDocs(this.buffer.splice(0));
    }

    return Promise.resolve();
  }

  bufferedPut(doc) {
    // Buffer put using a bulk operation
    this.buffer.push(doc);
    return Promise.resolve(doc);
  }

  getDocType(doc) {
    // Infer type from `doc`
    if (doc.demographics) {
      return 'demographics';
    } else if (doc.behavior && doc.behavior.type) {
      return doc.behavior.type;
    } else if (doc.type) {
      return doc.type;
    }

    return 'behavior';
  }

  close() {
    return this.database.close()
      .catch(() => { /* can happen after DB is destroyed */ });
  }

  destroy() {
    return this.database.destroy();
  }

  info() {
    return this.database.info();
  }

  remove(doc) {
    return this.database.remove(doc);
  }

  get(...args) {
    return this.database.get(...args);
  }

  put(doc, buffered = false) {
    const decoratedDoc = doc;

    // Add an _id
    if (decoratedDoc._id === undefined) {
      const type = this.getDocType(doc);
      const docHash = md5(JSON.stringify(doc));
      decoratedDoc._id = `${doc.ts || Date.now()}/${type}/${docHash}`;
    }

    // Add a timestamp
    if (decoratedDoc.ts === undefined) {
      decoratedDoc.ts = getSynchronizedDate().format(DATE_FORMAT);
    }

    logger.debug('put', buffered, decoratedDoc);

    // Insert/Update document
    if (buffered) {
      return this.bufferedPut(decoratedDoc);
    }
    return this.database.put(decoratedDoc).then(() => decoratedDoc);
  }

  getN(n) {
    return this.database.allDocs({
      include_docs: true,
      limit: n,
    })
    .then(result => result.rows.map(row => row.doc))
    .then(result => result.filter(doc => doc._id !== '_design/index'));
  }

  getByTimespan({ from, to } = { }) {
    logger.debug('getByTimespan', from, '->', to);
    return this.database.query('index/by_ts', {
      startkey: from,
      endkey: to,
      include_docs: true,
    }).then((result) => {
      logger.debug('getByTimespan from', from, 'to', to, 'found', result.rows.length, 'documents');
      return result.rows.map(row => row.doc);
    });
  }

  getTypesByTimespan(timespan) {
    /* eslint no-param-reassign: off */
    return this.getByTimespan(timespan)
      .then((documents) => {
        const types = Object.create(null);
        for (let i = 0; i < documents.length; i += 1) {
          const doc = documents[i];
          const type = this.getDocType(doc);

          types[type] = types[type] || [];
          types[type].push(doc);
        }
        return types;
      });
  }

  deleteByTimespan(timespan) {
    logger.debug('delete by timespan', timespan);
    return this.getByTimespan(timespan)
      .then((documents) => {
        logger.debug('remove', documents.length, 'with timespan', timespan);

        // Add _deleted: true to each document to make sure they are deleted
        for (let i = 0; i < documents.length; i += 1) {
          documents[i]._deleted = true;
        }

        // Delete documents in bulk
        return this.database.bulkDocs(documents);
      });
  }
}
