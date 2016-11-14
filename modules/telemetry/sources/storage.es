export default class {
  constructor(database) {
    this.database = database;

    const designDoc = {
      _id: '_design/index',
      views: {
        by_ts: {
          map: function (doc) {
            emit(doc.ts);
          }.toString(),
        },
      },
    };

    // TODO: don't try to insert if it already exists
    this.database.put(designDoc).then(() => {
      this.database.query('index/by_ts', {
        limit: 0,
      });
    });
  }

  put(record) {
    // TODO: replace by synchronised date
    record.ts = record.ts || Date.now();
    // TODO: don't use 'post' (https://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html)
    //       'id' could be 'type' + 'ts'
    return this.database.post(record);
  }

  getByTimespan({ from, to } = { }) {
    return this.database.query('index/by_ts', {
      startkey: from,
      endkey: to,
      include_docs: true,
    }).then(result => result.rows.map(row => row.doc));
  }

  getTypesByTimespan(timespan) {
    return this.getByTimespan(timespan)
      // group by type
      .then(documents => documents.reduce((pre, cur) => {
        // TODO: use 'type' instead of 'id'
        const type = cur.id;
        pre[type] = pre[type] || [];
        pre[type].push(cur);
        return pre;
      }, Object.create(null)));
  }

  deleteByTimespan(timespan) {
    return this.getByTimespan(timespan)
      // TODO: find out why `.then(documents => this.database.bulkDocs(documents,
      //       { _deleted: true }));` does not work
      .then(documents => Promise.all(documents.map(doc => this.database.remove(doc))));
  }
}
