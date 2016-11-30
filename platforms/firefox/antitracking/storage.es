import getDbConn from 'platform/sqlite';

const LOG_KEY = "storage-sqlite";
let dbConn;

function init() {
  dbConn = getDbConn('cliqz.dbattrack');
  var attrack_table = 'create table if not exists attrack(id VARCHAR(24) PRIMARY KEY NOT NULL, data VARCHAR(1000000))';
  (dbConn.executeSimpleSQLAsync || dbConn.executeSimpleSQL)(attrack_table);
}

function loadRecord(id, callback) {
  if (!dbConn) {
    init();
  }
  if (id.startsWith('cliqz.dbattrack.')) {
    id = id.substring('cliqz.dbattrack.'.length);
  }

  var stmt = dbConn.createAsyncStatement("SELECT id, data FROM attrack WHERE id = :id;");
      stmt.params.id = id;

  var fres = null;
  var res = [];
  stmt.executeAsync({
    handleResult: function(aResultSet) {
      for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
        if (row.getResultByName("id")==id) {
            res.push(row.getResultByName("data"));
        }
        else {
          CliqzUtils.log("There are more than one record", LOG_KEY);
          callback(null);
        }
        break;
      }
    },
    handleError: function(aError) {
        CliqzUtils.log("SQL error: " + aError.message, LOG_KEY);
        callback(null);
    },
    handleCompletion: function(aReason) {
        if (res.length == 1) callback(res[0]);
        else callback(null);
    }
  });
};

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
  const stmt = dbConn.createAsyncStatement("INSERT OR REPLACE INTO attrack (id,data) VALUES (:id, :data)");
  stmt.params.id = id;
  stmt.params.data = data;

  // Warning: do not put any callbacks to Async queries,
  // they will blow if case Javascript contexed is terminated - for example
  // by user disabling extension.
  stmt.executeAsync();
};

export default {
  getItem: function(id) {
    return new Promise( (resolve, reject) => {
      loadRecord(id, resolve);
    });
  },
  setItem: function(id, value) {
    saveRecord(id, value);
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
