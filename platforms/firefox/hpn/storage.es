import { fileExists } from '../../core/fs';
import console from '../../core/console';
import { open, close } from '../sqlite';

export default class {
  constructor(CliqzSecureMessage) {
    this.CliqzSecureMessage = CliqzSecureMessage;
    this.dbName = 'cliqz.dbhumanweb';

    if (fileExists(this.dbName)) {
      this.connection = open(this.dbName);
    } else {
      this.connection = open(this.dbName);
    }

    // Need to check for create table, even if the DB already exists.
    this.createTable();
  }

  createTable() {
    const localcheck = `create table if not exists localcheck(
      id VARCHAR(24) PRIMARY KEY NOT NULL,
      data VARCHAR(1000000)
    )`;
    (this.connection.executeSimpleSQLAsync || this.connection.executeSimpleSQL)(localcheck);
  }

  close() {
    close(this.dbName);
    this.connnection = null;
  }

  saveRecord(id, data) {
    if (!this.connection) {
      return;
    }
    const st = this.connection.createStatement('INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)');
    st.params.id = id;
    st.params.data = data;

    st.executeAsync({
      handleError: (aError) => {
        if (this.CliqzSecureMessage && this.CliqzSecureMessage.debug) {
          console.log(`SQL error: ${aError.message}`, this.CliqzSecureMessage.LOG_KEY);
        }
      },
      handleCompletion: () => {
        if (this.CliqzSecureMessage && this.CliqzSecureMessage.debug) {
          console.log('Insertion success', this.CliqzSecureMessage.LOG_KEY);
        }
      }
    });
  }

  loadRecord(id, callback) {
    const stmt = this.connection.createAsyncStatement('SELECT id, data FROM localcheck WHERE id = :id;');
    stmt.params.id = id;

    const res = [];
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        if (!this.CliqzSecureMessage) {
          return;
        }
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          if (row.getResultByName('id') === id) {
            res.push(row.getResultByName('data'));
          } else {
            if (this.CliqzSecureMessage.debug) {
              console.log('There are more than one record', this.CliqzSecureMessage.LOG_KEY);
            }
            callback(null);
          }
          break;
        }
      },
      handleError: (aError) => {
        if (!this.CliqzSecureMessage) return;
        if (this.CliqzSecureMessage.debug) {
          console.log(`SQL error: ${aError.message}`, this.CliqzSecureMessage.LOG_KEY);
        }
        callback(null);
      },
      handleCompletion: () => {
        if (!this.CliqzSecureMessage) {
          return;
        }
        if (res.length === 1) {
          callback(res[0]);
        } else {
          callback(null);
        }
      }
    });
  }

  loadKeys() {
    return new Promise((resolve) => {
      this.loadRecord('userKey', (data) => {
        if (!data) {
          if (this.CliqzSecureMessage.debug) {
            console.log('There was no key for the user', this.CliqzSecureMessage.LOG_KEY);
          }
          resolve(null);
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (ee) {
            resolve(null);
          }
        }
      });
    });
  }

  saveKeys(_data) {
    return new Promise((resolve) => {
      if (!this.connection) {
        return;
      }
      const st = this.connection.createStatement('INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)');
      st.params.id = 'userKey';
      st.params.data = JSON.stringify(_data);

      st.executeAsync({
        handleError: (aError) => {
          if (this.CliqzSecureMessage && this.CliqzSecureMessage.debug) {
            if (this.CliqzSecureMessage.debug) {
              console.log(`SQL error: ${aError.message}`, this.CliqzSecureMessage.LOG_KEY);
            }
            resolve({ status: false, data: _data });
          }
        },
        handleCompletion: () => {
          if (this.CliqzSecureMessage && this.CliqzSecureMessage.debug) {
            if (this.CliqzSecureMessage.debug) {
              console.log('Insertion success', this.CliqzSecureMessage.LOG_KEY);
            }
            resolve({ status: true, data: _data });
          }
        }
      });
    });
  }

  loadLocalCheckTable() {
    this.loadRecord('localTemporalUniq', (data) => {
      if (!data) {
        if (this.CliqzSecureMessage.debug) {
          console.log('There was no data on action stats', this.CliqzSecureMessage.LOG_KEY);
        }
        this.CliqzSecureMessage.localTemporalUniq = {};
      } else {
        try {
          this.CliqzSecureMessage.localTemporalUniq = JSON.parse(data);
        } catch (ee) {
          console.log(`Loading local uniq: ${ee}`, this.CliqzSecureMessage.LOG_KEY);
          this.CliqzSecureMessage.localTemporalUniq = {};
        }
      }
    });
  }

  saveLocalCheckTable() {
    if (this.CliqzSecureMessage.localTemporalUniq) {
      this.saveRecord('localTemporalUniq', JSON.stringify(this.CliqzSecureMessage.localTemporalUniq));
    }
  }
}
