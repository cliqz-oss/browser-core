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

export default class {

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
