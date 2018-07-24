/* eslint no-param-reassign: 'off' */

import getDbConn from '../sqlite';
import console from '../../core/console';

const LOG_KEY = 'storage-sqlite';
let dbConn;

function init() {
  dbConn = getDbConn('cliqz.dbattrack');
  const attrackTable = 'create table if not exists attrack(id VARCHAR(24) PRIMARY KEY NOT NULL, data VARCHAR(1000000))';
  (dbConn.executeSimpleSQLAsync || dbConn.executeSimpleSQL)(attrackTable);
}

function loadRecord(id, callback) {
  if (!dbConn) {
    init();
  }
  if (id.startsWith('cliqz.dbattrack.')) {
    id = id.substring('cliqz.dbattrack.'.length);
  }

  const stmt = dbConn.createAsyncStatement('SELECT id, data FROM attrack WHERE id = :id;');
  stmt.params.id = id;

  const res = [];
  stmt.executeAsync({
    handleResult(aResultSet) {
      for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
        if (row.getResultByName('id') === id) {
          res.push(row.getResultByName('data'));
        } else {
          console.log('There are more than one record', LOG_KEY);
          callback(null);
        }
        break;
      }
    },
    handleError(aError) {
      console.log(`SQL error: ${aError.message}`, LOG_KEY);
      callback(null);
    },
    handleCompletion() {
      if (res.length === 1) {
        console.log(`Load ${id}, data length = ${res[0].length}`, LOG_KEY);
        callback(res[0]);
      } else callback(null);
    }
  });
}

/** Save data to the attrack sqlite table.
    From CliqzAttrack.saveRecord
 */
function saveRecord(id, data) {
  if (!dbConn) {
    init();
  }
  if (id.startsWith('cliqz.dbattrack.')) {
    id = id.substring('cliqz.dbattrack.'.length);
  }
  const stmt = dbConn.createAsyncStatement('INSERT OR REPLACE INTO attrack (id,data) VALUES (:id, :data)');
  stmt.params.id = id;
  stmt.params.data = data;

  // Warning: do not put any callbacks to Async queries,
  // they will blow if case Javascript contexed is terminated - for example
  // by user disabling extension.
  stmt.executeAsync();
}

function deleteRecord(id) {
  if (!dbConn) {
    init();
  }
  if (id.startsWith('cliqz.dbattrack.')) {
    id = id.substring('cliqz.dbattrack.'.length);
  }

  const stmt = dbConn.createAsyncStatement('DELETE FROM attrack WHERE id = :id');
  stmt.params.id = id;
  stmt.executeAsync();
}

export default {
  getItem(id) {
    return new Promise((resolve) => {
      loadRecord(id, resolve);
    });
  },
  setItem(id, value) {
    saveRecord(id, value);
  },
  removeItem(id) {
    deleteRecord(id);
  },
  setObject(key, object) {
    this.setItem(key, JSON.stringify(object));
  },
  getObject(key, notFound = false) {
    const o = this.getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  },
};
