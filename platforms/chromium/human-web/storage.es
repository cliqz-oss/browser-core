const humanWebChromeDB = {
  VERSION: '0.1',
  set: (db, key, obj, callback) => {
    const dbKey = `${db}:${key}`;
    const o = {};
    o[dbKey] = obj;
    chrome.storage.local.set(o, callback);
  },
  get: (db, keyValueOrFunction, callback) => {

    if (typeof keyValueOrFunction === 'function') {
      chrome.storage.local.get(null, (items) => {
        const results = [];
        Object.keys(items).forEach((lab) => {
          if (lab.startsWith(db)) {
            if (keyValueOrFunction(items[lab])) results.push(items[lab]);
          }
        });
        callback(results);
      });
    } else {
      const dbKey = `${db}:${keyValueOrFunction}`;
      chrome.storage.local.get(dbKey, (items) => {
        callback(items[dbKey]);
      });
    }
  },
  remove: (db, keyValueOrFunction, callback) => {
    if (typeof keyValueOrFunction === 'function') {
      chrome.storage.local.get(null, (items) => {
        const resultsToBeRemoved = [];
        Object.keys(items).forEach((lab) => {
          if (lab.startsWith(db)) {
            if (keyValueOrFunction(items[lab])) {
              const dbKey = `${db}:${lab}`;
              resultsToBeRemoved.push(dbKey);
            }
          }
        });

        chrome.storage.local.remove(resultsToBeRemoved, callback);
      });
    } else {
      const dbKey = `${db}:${keyValueOrFunction}`;
      chrome.storage.local.remove(dbKey, callback);
    }
  },
  size: (callback) => {
    chrome.storage.local.getBytesInUse(null, (a) => {
      const res = [a, a / chrome.storage.local.QUOTA_BYTES];
      this.CliqzHumanWeb.log('Current size: ', res[0], res[1]);
      if (callback) callback(res);
    });
  },
  removeEverything: () => {
    chrome.storage.local.clear();
    this.dbConn.size();
  },
};

export default class {
  constructor(CliqzHumanWeb) {
    this.CliqzHumanWeb = CliqzHumanWeb;
    this.dbConn = humanWebChromeDB;
  }

  init() {
    return Promise.resolve(this.dbConn);
  }

  asyncClose() {
    return Promise.resolve();
  }

  getDBConn() {
    return this.dbConn;
  }

  saveRecordTelemetry(id, data, callback) {
    this.dbConn.set('telemetry', id, data, callback);
  }

  loadRecordTelemetry(id, callback) {
    this.dbConn.get('telemetry', id, (obj) => {
      if (!obj) callback(null);
      else callback(obj);
    });
  }

  historyTimeFrame() {}
  deleteVisit() {}
  deleteTimeFrame() {}
  clearHistory() {}

  // Need to improve this.
  getListOfUnchecked(cap, sec_old, fixed_url, callback) {
    const tt = new Date().getTime();
    // const _this = this;
    if (fixed_url == null) {
      this.dbConn.get('usafe', function(o) {
        let record = JSON.parse(o);
          if (record.last_visit < (tt - sec_old * 1000)) return true;
      }, function(items) {
          if (!items || items.length==0) callback([], null);

          // better do it here so we avoid JSON.parse on all elements
          items = items.splice(0, cap);

          var res = [];
          items.forEach(function(item) {
              let _item = JSON.parse(item);
              res.push([_item.url, _item.payload]);
          });

          console.log("Got the result: " + res[0]);
          callback(res.splice(0, cap), null);
      });
    } else {
      this.dbConn.get('usafe', fixed_url, (obj) => {
          let record = JSON.parse(obj);
          if (!record) callback([], null);
          else if (record.last_visit < (tt - sec_old * 1000)) {
              var res = [];
              res.push([record.url, record.payload]);
              console.log("Got the result: " + record);
              callback(res.splice(0, cap), null);
          } else { 
            callback([], null);
          }
      });
    }
  }

  escapeSQL() {}

  saveURL(url, newObj, callback) {
    const record = JSON.stringify(newObj);
    this.dbConn.set('usafe', url, record, () => {
      callback();
    });
  }

  updateURL(url, newObj, callback) {
    const record = JSON.stringify(newObj);
    this.dbConn.set('usafe', url, record, () => {
      callback();
    });
  }

  getURL(url, callback) {
    this.dbConn.get('usafe', url, (obj) => {
      if (!obj || obj === 'undefined') {
        callback([]);
      } else {
        const record = JSON.parse(obj);
        callback(record);
      }
    });
  }

  removeUnsafe(url, callback) {
    this.dbConn.remove('usafe', url, () => {
      // Need to find better error handling for chrome storage.
      callback(true);
    });
  }
}
