export default class {

  constructor(queryDB) {
    this.queryDB = queryDB;

    const ddoc = {
      _id: '_design/url_index',
      views: {
        by_url: {
          map: `
          function (doc) {
            return Object.keys(doc.urls).forEach(
              url => emit(url, doc.id)
            );
          }`,
        },
      },
    };

    this.queryDB.put(ddoc).then(() => {
      this.queryDB.query('url_index/by_url', {
        limit: 0,
      });
    });
  }

  record(query, url) {
    // find existing documents, create new if not found
    return this.queryDB.get(query)
      .catch(() => ({ _id: query, urls: {} }))
      .then((queryDoc) => {
        const doc = Object.assign({
          count: 0,
          urls: {},
        }, queryDoc, {
          lastQueriedAt: Date.now(),
        });
        doc.urls[url] = true;
        doc.count += 1;

        return this.queryDB.put(doc);
      });
  }

  getQueries() {
    return this.queryDB.allDocs({ include_docs: true }).then(
      res => res.rows.map(row => row.doc),
    );
  }

  getUrls(query) {
    return this.queryDB.get(query)
      .then(doc => Object.keys(doc.urls || {}))
      .catch(() => []);
  }

  getQueriesForUrls(urls) {
    return this.queryDB.query(
      'url_index/by_url',
      {
        keys: urls,
      },
    ).then(result =>
      urls.map((url) => {
        const row = result.rows.find(r => r.key === url);
        return (row || {}).id;
      }),
    );
  }

  getQuery(url) {
    return this.queryDB.query(
      'url_index/by_url',
      {
        key: url,
      },
    ).then(result => (result.rows[0] || {}).id);
  }

}
