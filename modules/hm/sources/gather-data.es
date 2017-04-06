import CliqzUtils from 'core/utils';
import { len, btoa_safe } from 'hm/helpers';

Components.utils.import('resource://gre/modules/PlacesUtils.jsm');
const Ci = Components.interfaces;

export default class GatherData {
  static unifyData(data) {
    const res = [];
    for (let i = 0; i < 6; ++i) {
      for (let j = 0; j < data[i].length; ++j) {
        data[i][j].unshift(i);
        res.push(data[i][j]);
      }
    }
    return res;
  }
  static deUnifyData(data) {
    const res = [];
    data.forEach(x => {
      const type = x[0];
      const dataNew = x.slice(1);
      if (!res[type]) {
        res[type] = [];
      }
      res[type].push(dataNew);
    });
    for (let i = 0; i < 6; ++i) {
      if (!res[i]) {
        res[i] = [];
      }
    }
    return res;
  }
  static getDataArray() {
    return GatherData.getRawData().then(data => GatherData.unifyData(data));
  }
  static getRawData() {
    const promises = [
      GatherData.getMozPlaces(),
      GatherData.getInputHistory(),
      GatherData.getHistoryVisits(),
      [],
      [],
      [],
    ];
    return Promise.all(promises)
        .then(values => {
          CliqzUtils.log(len(values[4]), 'RESP');
          CliqzUtils.log(`URLS Collected: ${len(values[0])}`);
          return values;
        });
  }
  static getData() {
    return GatherData.getRawData().then(data => {
      const returnResult = btoa_safe(JSON.stringify(data));
      CliqzUtils.log(`Size: ${(len(returnResult) / 1000000)}`);
      return returnResult;
    });
  }

  static executeSQL(conn, sql, numCols) {
    return new Promise((resolve, reject) => {
      const results = [];
      conn.createAsyncStatement(sql).executeAsync({
        handleCompletion() {
          resolve(results);
        },

        handleError(error) {
          reject(error);
        },

        handleResult(resultSet) {
          let row = resultSet.getNextRow();
          while (row) {
            const res = new Array(numCols);
            for (let i = 0; i < numCols; ++i) {
              res[i] = row.getResultByIndex(i);
            }
            results.push(res);
            row = resultSet.getNextRow();
          }
        },
      });
    });
  }

  static getHistoryVisits() {
    const cols = ['id', 'from_visit', 'place_id', 'visit_date', 'visit_type', 'session'];
    const conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
    const sql = `SELECT ${cols.join(',')} FROM moz_historyvisits`;
    return GatherData.executeSQL(conn, sql, cols.length);
  }

  static getInputHistory() {
    const cols = [
      'place_id',
      'input',
      'use_count',
    ];
    const conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
    const sql = `SELECT ${cols.join(',')} FROM moz_inputhistory`;
    return GatherData.executeSQL(conn, sql, cols.length);
  }

  static getMozPlaces() {
    const cols = [
      'id',
      'url',
      'title',
      'rev_host',
      'visit_count',
      'hidden',
      'typed',
      'favicon_id',
      'frecency',
      'last_visit_date',
      'guid',
      'foreign_count',
    ];
    const conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
    const sql = `SELECT ${cols.join(',')} FROM moz_places`;
    return GatherData.executeSQL(conn, sql, cols.length);
  }
}
