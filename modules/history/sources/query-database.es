export default class {

  constructor(queryDB) {
    this.queryDB = queryDB;

    var ddoc = {
      _id: '_design/url_index',
      views: {
        by_url: {
          map: function (doc) {
            return Object.keys(doc.urls).forEach(
              url => emit(url, doc.id)
            );
          }.toString()
        }
      }
    };

    this.queryDB.put(ddoc).then(() => {
      this.queryDB.query('url_index/by_url', {
        limit: 0
      });
    });
  }

  record(query, url) {
    // find existing documents, create new if not found
    return this.queryDB.get(query)
      .catch( () => ({ _id: query, urls: {} }) )
      .then( queryDoc => {
        queryDoc.urls = queryDoc.urls || {};
        queryDoc.urls[url] = true;
        queryDoc.count = (queryDoc.count || 0) + 1;
        queryDoc.lastQueriedAt = Date.now();

        return this.queryDB.put(queryDoc);
      });
  }

  getQueries() {
    return this.queryDB.allDocs({ include_docs: true }).then(
      res => res.rows.map(row => row.doc)
    );
  }

  getUrls(query) {
    return this.queryDB.get(query)
      .then( doc => Object.keys(doc.urls || {}) )
      .catch( () => []);
  }

  getQueriesForUrls(urls) {
    return this.queryDB.query(
      "url_index/by_url",
      {
        keys: urls
      }
    ).then(result => {
      return urls.map( url => {
        const row = result.rows.find( row => row.key === url );
        return (row || {}).id;
      });
    });
  }

  getQuery(url) {
    return this.queryDB.query(
      "url_index/by_url",
      {
        key: url
      }
    ).then(result => {
      return (result.rows[0] || {}).id;
    });
  }

}
