/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * This module will provide an interface for saving / loading persistent data.
 *
 */

import console from '../console';

export default class SimpleDB {
  //
  // @brief constructor
  // @param db  the database instance to use (pouchdb)
  //
  constructor(db, logger = console, contID = 'docData') {
    this.db = db;
    this.contID = contID;
    this.logger = logger;
  }

  upsert(docID, docData) {
    return this.db.get(docID)
      .catch(() => ({ _id: docID, [this.contID]: {} }))
      .then((data) => {
        // Dexie will not raise error but simply return undefined when docID does not exist
        if (data === undefined) {
          /* eslint-disable-next-line */
          data = { _id: docID, [this.contID]: {} };
        }
        this.db.put({
          ...data,
          [this.contID]: {
            ...data.docData,
            ...docData,
          },
        });
      });
  }

  get(docID) {
    return this.db.get(docID)
      .then(doc => doc[this.contID])
      .catch((err) => {
        if (err && err.status && err.status !== 404) {
          this.logger.error(`getDocData: error getting doc ${docID} with err: `, err);
        } else {
          this.logger.log(`missing DB entry for docID ${docID}`);
        }
        return null;
      });
  }

  remove(docID) {
    // https://pouchdb.com/api.html#delete_document
    return this.db.get(docID).then((doc) => {
      this.logger.log(`removeDocData: removing doc ${docID}`);
      return this.db.remove(doc);
    }).then(() => {
      // nothing to do
      this.logger.log(`removeDocData: doc ${docID} removed properly`);
    }).catch((err) => {
      // nothing to do there
      if (err && err.status && err.status !== 404) {
        this.logger.error(`removeDocData: something happened removing the doc: ${docID} - err:`, err);
      } else {
        this.logger.log(`missing DB entry for docID ${docID}`);
      }
    });
  }
}
