/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable */
function removeEmptyValues(obj) {
  for (var propName in obj) {
    if (!obj[propName] || obj[propName].length === 0) {
      delete obj[propName];
    } else if (typeof obj === 'object') {
      removeEmptyValues(obj[propName]);
    }
  }
  return obj;
}
/* eslint-enable */

export default class MetaDatabase {
  constructor(metaDB) {
    this.metaDB = metaDB;
  }

  record(url, metadata) {
    const meta = removeEmptyValues(metadata);
    return this.metaDB.get(url)
      .catch(() => ({ _id: url, meta: {} }))
      .then((metaDoc) => {
        const doc = Object.assign({}, metaDoc, {
          meta: Object.assign({}, metaDoc.meta, meta),
        });
        return this.metaDB.put(doc);
      });
  }

  getMeta(url) {
    return this.metaDB.get(url)
      .then(doc => doc.meta)
      .catch(() => ({}));
  }
}
