import prefs from '../../core/prefs';
import events from '../../core/events';
import Database from '../../core/database';

const cliqzVisit = [
  {
  title: 'CLIQZ',
  url: 'https://cliqz.com/',
  visit_date: 1000 * (Date.now()),
},{
  title: 'FACEBOOK',
  url: 'https://facebook.com/',
  visit_date: 1000 * (Date.now() - (1000 * 60 * 60 * 1)),
},{
  title: 'TWITTER',
  url: 'https://twitter.com/',
  visit_date: 1000 * (Date.now() - (1000 * 60 * 60 * 2)),
},{
  title: 'AMAZON',
  url: 'https://amazon.com/',
  visit_date: 1000 * (Date.now() - (1000 * 60 * 60 * 3)),
},{
  title: 'TELEDUNET',
  url: 'https://teledunet.com/',
  visit_date: 1000 * (Date.now() - (1000 * 60 * 60 * 4)),
}];

export default class {

  constructor() {
    this.visitsDb = new Database('visit-db');
    this.visitsDb.info().then((result) => {
      if (result.doc_count === 0) {
        cliqzVisit.forEach(visit => this.addHistoryEntry(visit));
      }
    });

    const ddoc = {
      _id: '_design/index',
      views: {
        visitedAt: {
          map: function (doc) {
            if (doc.visit_date) {
              emit(-1 * doc.visit_date);
            }
          }.toString()
        }
      }
    };
    this.visitsDb.get(ddoc._id).catch(() => ddoc).then((doc) => {
      ddoc._rev = doc._rev
      return this.visitsDb.put(ddoc);
    });

    events.sub('history:add', (entry) => {
      this.addHistoryEntry({
        title: entry.title,
        url: entry.url,
        visit_date: entry.lastVisitDate,
      });
    });

    setTimeout(this.fixBrokenDates.bind(this), 5000);
  }

  query({limit, frameStartsAt, frameEndsAt, domain, query}) {
    return this.visitsDb.query('index/visitedAt', {
      include_docs: true,
      limit,
    }).then((results) => {
      console.log(results);
      return {
        places: results.rows.map(r => r.doc).map(d => ({
          title: d.title,
          url: d.url,
          visit_date: parseInt(d.visit_date),
        })),
        from: frameStartsAt,
        to: frameEndsAt,
      };
    });
  }

  static fillFromVisit(url, triggeringUrl) {

  }

  formatTimeStamp(visitDate) {
    // get date in string form without a decimal point
    let ts = visitDate.toFixed !== undefined ? visitDate.toFixed(0) : visitDate;
    if (ts.length !== 16) {
      const errorFactor = Math.pow(10, 16 - ts.length);
      ts = (parseInt(ts) * errorFactor).toFixed(0);
    }
    return ts;
  }

  addHistoryEntry(entry) {
    const visitDate = this.formatTimeStamp(entry.visit_date || entry.lastVisitDate);
    // we assume visit_data is unique
    if (visitDate && entry.title && entry.url) {
      return this.visitsDb.get(entry.url)
        .catch(() => ({_id: entry.url}))
        .then((doc) => {
          if (visitDate > (doc.visit_date || '')) {
            doc.title = entry.title;
            doc.url = entry.url;
            doc.visit_date = visitDate;
            return this.visitsDb.put(doc);
          }
          return Promise.resolve();
        });
    }
    return Promise.reject();
  }

  fixBrokenDates() {
    this.visitsDb.allDocs({ include_docs: true }).then((result) => {
      const fixedDocs = result.rows.map(row => row.doc).filter((doc) => {
        // if it is an integer or string we wrong length, we should fix it
        return doc.visit_date &&
          (doc.visit_date.toFixed !== undefined || doc.visit_date.length !== 16);
      }).map((doc) => {
        // fix ts errors
        doc.visit_date = this.formatTimeStamp(doc.visit_date);
        return doc;
      });
      if (fixedDocs.length > 0) {
        console.log('history', `repairing ${fixedDocs.length} history entries`, fixedDocs);
        this.visitsDb.bulkDocs(fixedDocs);
      }
    });
  }

};
