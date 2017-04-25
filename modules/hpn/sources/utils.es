import CliqzSecureMessage from 'hpn/main';
import CliqzUtils from 'core/utils';

/*
Function to create http url
*/

export function createHttpUrl(host) {
  return 'http://' + host + '/verify';
}

/*
Converts given array to generator like object.
*/
export function trkGen(_trk) {
  const trk = _trk;
  let idx = -1;
  return {
    next: function() {
      idx += 1;
      if (idx < trk.length) {
        return {
          value: idx, // Return the first yielded value.
          done: false,
        };
      } else {
        return {
          value: undefined, // Return undefined.
          done: true,
        };
      }
    },
  };
}

export function createTable() {
  const localcheck = 'create table if not exists localcheck(\
    id VARCHAR(24) PRIMARY KEY NOT NULL,\
    data VARCHAR(1000000) \
    )';
  (CliqzSecureMessage.dbConn.executeSimpleSQLAsync || CliqzSecureMessage.dbConn.executeSimpleSQL)(localcheck);
}

function saveRecord(id, data) {
  if (!(CliqzSecureMessage.dbConn)) return;
  const st = CliqzSecureMessage.dbConn.createStatement('INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)');
  st.params.id = id;
  st.params.data = data;

  st.executeAsync({
    handleError: function (aError) {
      if (CliqzSecureMessage && CliqzSecureMessage.debug) {
        if (CliqzSecureMessage.debug) CliqzUtils.log('SQL error: ' + aError.message, CliqzSecureMessage.LOG_KEY);
      }
    },
    handleCompletion: function (aReason) {
      if (CliqzSecureMessage && CliqzSecureMessage.debug) {
        if (CliqzSecureMessage.debug) CliqzUtils.log('Insertion success', CliqzSecureMessage.LOG_KEY);
      }
    }
  });
}

function loadRecord(id, callback) {
  const stmt = CliqzSecureMessage.dbConn.createAsyncStatement('SELECT id, data FROM localcheck WHERE id = :id;');
  stmt.params.id = id;

  const res = [];
  stmt.executeAsync({
    handleResult: function (aResultSet) {
      if (!(CliqzSecureMessage)) return;
      for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
        if (row.getResultByName('id') === id) {
          res.push(row.getResultByName('data'));
        } else {
          if (CliqzSecureMessage.debug) {
            CliqzUtils.log('There are more than one record', CliqzSecureMessage.LOG_KEY);
          }
          callback(null);
        }
        break;
      }
    },
    handleError: function (aError) {
      if (!(CliqzSecureMessage)) return;
      if (CliqzSecureMessage.debug) CliqzUtils.log('SQL error: ' + aError.message, CliqzSecureMessage.LOG_KEY);
      callback(null);
    },
    handleCompletion: function (aReason) {
      if (!(CliqzSecureMessage)) return;
      if (res.length === 1) callback(res[0]);
      else callback(null);
    }
  });
}

export function saveLocalCheckTable() {
  if (CliqzSecureMessage.localTemporalUniq) {
    CliqzUtils.log('Saving local table');
    saveRecord('localTemporalUniq', JSON.stringify(CliqzSecureMessage.localTemporalUniq));
  }
}


export function loadKeys() {
  return new Promise(function(resolve, reject) {
    loadRecord ('userKey', function(data) {
      if (data == null) {
        if (CliqzSecureMessage.debug) {
          CliqzUtils.log('There was no key for the user', CliqzSecureMessage.LOG_KEY);
        }
        resolve(null);
      }
      else {
        try {
           resolve(JSON.parse(data));
        } catch(ee) {
          resolve(null);
        }
      }
    });
  })
}

export function saveKeys(_data) {
  return new Promise(function(resolve, reject) {
    if(!(CliqzSecureMessage.dbConn)) return;
    const st = CliqzSecureMessage.dbConn.createStatement('INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)');
    st.params.id = 'userKey';
    st.params.data = JSON.stringify(_data);

    st.executeAsync({
      handleError: function(aError) {
        if(CliqzSecureMessage && CliqzSecureMessage.debug){
          if (CliqzSecureMessage.debug) CliqzUtils.log('SQL error: ' + aError.message, CliqzSecureMessage.LOG_KEY);
          resolve({ status: false, data: _data });
        }
      },
      handleCompletion: function(aReason) {
        if (CliqzSecureMessage && CliqzSecureMessage.debug) {
          if (CliqzSecureMessage.debug) CliqzUtils.log('Insertion success', CliqzSecureMessage.LOG_KEY);
          resolve({ status: true, data: _data });
        }
      }
    });
  });
}

export function loadLocalCheckTable () {
  loadRecord('localTemporalUniq', function(data) {
    if (data == null) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('There was no data on action stats', CliqzSecureMessage.LOG_KEY);
      }
      CliqzSecureMessage.localTemporalUniq = {};
    } else {
      try {
        CliqzSecureMessage.localTemporalUniq = JSON.parse(data);
      } catch (ee) {
        CliqzUtils.log('Loading local uniq: ' + ee, CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.localTemporalUniq = {};
      }
    }
  });
}

export function prunelocalTemporalUniq() {
  if (CliqzSecureMessage.localTemporalUniq) {
    const currTime = Date.now();
    let pi = 0;
    Object.keys(CliqzSecureMessage.localTemporalUniq).forEach( e => {
      const d = CliqzSecureMessage.localTemporalUniq[e].ts;
      const diff = (currTime - d);
      if (diff >= (24 * 60 * 60 * 1000)) {
        delete CliqzSecureMessage.localTemporalUniq[e];
        pi += 1;
      }
    });
    /*
    if(CliqzHumanWeb.actionStats) {
        const itemsLocalValidation = Object.keys(CliqzSecureMessage.localTemporalUniq).length;
        CliqzHumanWeb.actionStats.itemsLocalValidation = itemsLocalValidation;
    }
    */
  }
}

export function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
