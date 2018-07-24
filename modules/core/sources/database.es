import Database from '../platform/database';
import console from './console';

export const dbs = new Map();

export default function DB(name, ...rest) {
  const info = dbs.get(name) || {
    name,
    createdAt: Date.now(),
    instances: 0,
  };
  info.instances += 1;
  dbs.set(name, info);
  return Database(name, ...rest);
}


/*
 * Prints report on currently used databases
 */
export function report() {
  const infos = [...dbs.keys()].map((dbName) => {
    const info = dbs.get(dbName);
    const db = new Database(dbName);
    let dbInfo;
    return db.info()
      .then((i) => { dbInfo = i; })
      .then(() => ({
        ...info,
        docs: dbInfo.doc_count,
        seq: dbInfo.update_seq,
      }));
  });

  return Promise.all(infos).then(
    reports => reports.reduce((obj, r) => ({
      ...obj,
      [r.name]: r,
    }), {})
  );
}

function printReport(r) {
  console.log('Db report', JSON.stringify(r, null, 2));
}

/*
 * Sets interval that will generate database report every given interval.
 *
 * Report will be printed in browser console along with information on the
 * changes from last interval and from the first report.
 *
 * This helps to identify databases that grow too fast.
 *
 */
export function reportPeriodically(ms) {
  let firstReports;
  let prevReports = {};
  function makeReport() {
    report().then((currReports) => {
      if (!firstReports) {
        firstReports = currReports;
      }

      const diff = {};

      [...dbs.keys()].forEach((dbName) => {
        const firstReport = firstReports[dbName] || {
          docs: 0,
          seq: 0,
        };
        const prevReport = prevReports[dbName] || {
          docs: 0,
          seq: 0,
        };
        const currReport = currReports[dbName] || {
          docs: 0,
          seq: 0,
        };
        diff[dbName] = {
          diffToPrev: {
            docs: prevReport.docs ? (currReport.docs - prevReport.docs) : 0,
            seq: currReport.seq ? (currReport.seq - prevReport.seq) : 0,
          },
        };

        if (firstReports !== currReports) {
          diff[dbName].diffToFirst = {
            docs: currReport.docs - firstReport.docs,
            seq: currReport.seq - firstReport.seq,
          };
        }
      });

      prevReports = currReports;
      printReport(diff);
    }).catch(console.error.bind(console, 'DB report error'));
  }
  makeReport();
  const interval = setInterval(makeReport, ms);
  return {
    stop() {
      clearInterval(interval);
    }
  };
}
