/* global FileUtils */
/* eslint no-restricted-syntax: 'off' */
/* eslint func-names: 'off' */

import { Components } from '../globals';

Components.utils.import('resource://gre/modules/FileUtils.jsm');

export default class {
  constructor(humanWeb) {
    this.humanWeb = humanWeb;
    this.dbConn = null;
  }

  init() {
    if (FileUtils.getFile('ProfD', ['cliqz.dbusafe']).exists()) {
      if (this.olddbConn === null) {
        this.olddbConn = Services.storage.openDatabase(FileUtils.getFile('ProfD', ['cliqz.dbusafe']));
      }

      try {
        (this.olddbConn.executeSimpleSQLAsync || this.olddbConn.executeSimpleSQL)('DROP TABLE usafe;');
      } catch (ee) {
        // empty
      }
    }

    if (FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']).exists()) {
      if (this.dbConn === null) {
        this.dbConn = Services.storage.openDatabase(FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']));
      }
      this.createTable();
    } else {
      this.dbConn = Services.storage.openDatabase(FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']));
      this.createTable();
    }

    return Promise.resolve(this.dbConn);
  }

  asyncClose() {
    if (this.dbConn) {
      return new Promise((resolve, reject) => {
        try {
          this.dbConn.asyncClose(() => {
            this.dbConn = null;
            resolve();
          });
        } catch (e) {
          reject(e);
        }
      });
    }
    return Promise.resolve();
  }

  getDBConn() {
    return this.dbConn;
  }

  removeUnsafe(url, callback) {
    const st = this.dbConn.createStatement('DELETE from usafe WHERE url = :url');
    st.params.url = url;
    // while (st.executeStep()) {};
    st.executeAsync({
      handleError: (aError) => {
        this.humanWeb.log(`SQL error: ${aError.message}`);
        callback(false);
      },
      handleCompletion: () => {
        if (this.humanWeb.debug) {
          this.humanWeb.log('Delete success');
          callback(true);
        }
      }
    });
  }

  getListOfUnchecked(cap, secOld, fixedUrl, callback) {
    const tt = new Date().getTime();
    let stmt = null;
    if (fixedUrl == null) {
      // all urls
      stmt = this.dbConn.createAsyncStatement('SELECT url, payload FROM usafe WHERE last_visit < :last_visit LIMIT :cap;');
    } else {
      stmt = this.dbConn.createAsyncStatement('SELECT url, payload FROM usafe WHERE last_visit < :last_visit and url = :url LIMIT :cap;');
      stmt.params.url = fixedUrl;
    }
    stmt.params.last_visit = (tt - (secOld * 1000));
    stmt.params.cap = cap;

    const res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push([row.getResultByName('url'), JSON.parse(row.getResultByName('payload'))]);
        }
      },
      handleError: (aError) => {
        this.humanWeb.log(`SQL error: ${aError.message}`);
      },
      handleCompletion: (aReason) => {
        if (aReason !== Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log('SQL canceled or aborted');
        } else {
          if (res.length > 0) {
            this.humanWeb.log(`Got the result: ${res[0]}`);
          }
          callback(res.splice(0, cap), null);
        }
      }
    });
  }

  saveRecordTelemetry(id, data, callback) {
    if (!(this.dbConn)) return;
    const st = this.dbConn.createStatement('INSERT OR REPLACE INTO telemetry (id,data) VALUES (:id, :data)');
    st.params.id = id;
    st.params.data = data;

    st.executeAsync({
      handleError: (aError) => {
        if (this.humanWeb && this.humanWeb.debug) {
          this.humanWeb.log(`SQL error: ${aError.message}`);
        }
        callback(false);
      },
      handleCompletion: () => {
        if (this.humanWeb && this.humanWeb.debug) {
          this.humanWeb.log('Insertion success save record');
        }
        callback(true);
      }
    });
  }

  loadRecordTelemetry(id, callback) {
    const stmt = this.dbConn.createAsyncStatement('SELECT id, data FROM telemetry WHERE id = :id;');
    stmt.params.id = id;

    const res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        if (!(this.humanWeb)) return;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          if (row.getResultByName('id') === id) {
            res.push(row.getResultByName('data'));
          } else {
            this.humanWeb.log('There are more than one record');
            callback(null);
          }
          break;
        }
      },
      handleError: (aError) => {
        if (!(this.humanWeb)) return;
        this.humanWeb.log(`SQL error: ${aError.message}`);
        callback(null);
      },
      handleCompletion: () => {
        if (!(this.humanWeb)) return;
        if (res.length === 1) callback(res[0]);
        else callback(null);
      }
    });
  }

  SQL(sql, onRow, callback, parameters) {
    // temporary fix to avoid console logs if human web is disabled
    // the history listner should be handled better if HW module is disabled
    if (!this.dbConn) return;

    const st = this.dbConn.createAsyncStatement(sql);

    for (const key in parameters) {
      if (Object.prototype.hasOwnProperty.call(parameters, key)) {
        st.params[key] = parameters[key];
      }
    }

    this._SQL(this.dbConn, st, onRow, callback);
  }

  _SQL(dbConn, statement, onRow, callback) {
    statement.executeAsync({
      onRow,
      callback,
      handleResult: (aResultSet) => {
        let resultCount = 0;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          resultCount += 1;
          if (this.onRow) {
            this.onRow(statement.row);
          }
        }
        if (this.callback) {
          this.callback(resultCount);
        }
      },

      handleError: (aError) => {
        this.humanWeb.log(`Error (${aError.result}):${aError.message}`);
        if (this.callback) {
          this.callback(0);
        }
      },
      handleCompletion: () => {
        // Always called when done
      }
    });
    statement.finalize();
  }

  deleteVisit(url) {
    this.SQL('delete from usafe where url = :url', null, null, {
      url: this.escapeSQL(url)
    });
  }

  clearHistory() {
    this.SQL('delete from usafe');
  }

  isPrivate(url, depth, callback) {
    // This needs to be rewritten.
    callback(false);
    /*
    // returns 1 is private (because of checked, of because the referrer is private)
    // returns 0 if public
    // returns -1 if not checked yet, handled as public in this cases,
    var res = [];
    var st = this.dbConn.createStatement('SELECT * FROM usafe WHERE url = :url');
    st.params.url = url;

    var res = [];
    st.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({'url': row.getResultByName('url'), 'ref': row.getResultByName('ref'),
            'private': row.getResultByName('private'), 'checked': row.getResultByName('checked')});
        }
      },
      handleError: (aError) => {
        this.humanWeb.log('SQL error: ' + aError.message);
        callback(true);
      },
      handleCompletion: (aReason) => {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
          this.humanWeb.log('SQL canceled or aborted');
          callback(true);
        } else {
          if (res.length == 1) {
            if (res[0].ref!='' && res[0].ref!=null) {
              // the urls already exists in the DB, it has been seen before
              if (depth < 10) {
                if (this.humanWeb.auxSameDomain(res[0].ref, url)) {
                  this.isPrivate(res[0].ref, depth+1, function(priv) {
                    callback(priv);
                  });
                }
                else callback(false);
              }
              else {
                // set to private (becasue we are not sure so beter safe than sorry),
                // there is a loop of length > 10 between a <- b <- .... <- a, so if we do not
                // break recursion it will continue to do the SELECT forever
                //
                callback(true);
              }
            }
            else {
              callback(false);
            }
          }
          else {
            callback(true);
          }
        }
      },
    });
    */
  }

  createTable() {
    const usafe = 'create table if not exists usafe(\n' +
                'url VARCHAR(255) PRIMARY KEY NOT NULL,\n' +
                'ref VARCHAR(255),\n' +
                'last_visit INTEGER,\n' +
                'first_visit INTEGER,\n' +
                'reason VARCHAR(256), \n' +
                'private BOOLEAN DEFAULT 0,\n' +
                'checked BOOLEAN DEFAULT 0, \n' +
                'payload VARCHAR(4096), \n' +
                'ft BOOLEAN DEFAULT 1 \n' +
            ')';

    const hashUnsafe = 'create table if not exists hashusafe(\n' +
                'hash VARCHAR(32) PRIMARY KEY NOT NULL,\n' +
                'private BOOLEAN DEFAULT 0 \n' +
            ')';

    const hashCans = 'create table if not exists hashcans(\n' +
                'hash VARCHAR(32) PRIMARY KEY NOT NULL \n' +
            ')';

    const telemetry = 'create table if not exists telemetry(\n' +
                'id VARCHAR(24) PRIMARY KEY NOT NULL,\n' +
                'data VARCHAR(1000000) \n' +
            ')';

    // TODO: Used to be asynchronous. In principle, there is no need
    // to use synchronous APIs here, but when using asynchronous APIs,
    // it should be changed, so that the function returns a promise.
    //
    // Once the profile exists, this operation is quite cheap (~1ms).
    //
    this.dbConn.executeSimpleSQL(usafe);
    this.dbConn.executeSimpleSQL(hashUnsafe);
    this.dbConn.executeSimpleSQL(hashCans);
    this.dbConn.executeSimpleSQL(telemetry);
  }

  escapeSQL(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r''\\%]/g, (char) => {
      switch (char) {
        case "'":
          return "''";
        default:
          return char;
      }
    });
  }

  saveURL(url, newObj, callback) {
    const st = this.dbConn.createStatement('INSERT INTO usafe (url,ref,last_visit,first_visit, payload, ft) VALUES (:url, :ref, :last_visit, :first_visit, :payload, :ft)');
    st.params.url = newObj.url;
    st.params.ref = newObj.ref;
    st.params.last_visit = newObj.last_visit;
    st.params.first_visit = newObj.first_visit;
    st.params.ft = newObj.ft;
    st.params.payload = JSON.stringify(newObj.payload);

    st.executeAsync({
      handleError: (aError) => {
        this.humanWeb.log(`SQL error: ${aError.message}`);
      },
      handleCompletion: () => {
        if (this.humanWeb.debug) {
          this.humanWeb.log('Insertion success add urltoDB');
        }
        callback();
      }
    });
  }

  updateURL(url, newObj, callback) {
    const st = this.dbConn.createStatement('UPDATE usafe SET last_visit = :last_visit, payload = :payload WHERE url = :url');
    st.params.url = newObj.url;
    st.params.last_visit = newObj.last_visit;
    st.params.payload = JSON.stringify(newObj.payload);
    // while (st.executeStep()) {};
    st.executeAsync({
      handleError: (aError) => {
        this.humanWeb.log(`SQL error: ${aError.message}`);
      },
      handleCompletion: () => {
        if (this.humanWeb.debug) {
          this.humanWeb.log('updated success');
        }
        callback();
      }
    });
  }

  getURL(url, callback) {
    const stmt = this.dbConn.createStatement('SELECT url, ft,  payload FROM usafe WHERE url = :url');
    stmt.params.url = url;

    const res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          res.push({
            url: row.getResultByName('url'),
            ft: row.getResultByName('ft'),
            payload: row.getResultByName('payload')
          });
        }
      },
      handleError: (aError) => {
        this.humanWeb.log(`SQL error: ${aError.message}`);
      },
      handleCompletion: () => {
        this.humanWeb.log('>> Completed >>> ');
        callback(res);
      }
    });
  }
}
