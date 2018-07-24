import console from '../../core/console';

// TODO: this entire file requires a rewrite from ground up
const CliqzChromeDB = {
  VERSION: '0.1',
  set(db, key, obj, callback) {
    const dbKey = `${db}:${key}`;
    const o = {};
    o[dbKey] = obj;
    chrome.storage.local.set(o, callback);
  },
  get(db, keyValueOrFunction, callback) {
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
  remove(db, keyValueOrFunction, callback) {
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
  size(callback) {
    chrome.storage.local.getBytesInUse(null, (a) => {
      const res = [a, a / chrome.storage.local.QUOTA_BYTES];
      console.log('Current size: ', res[0], res[1]);
      if (callback) callback(res);
    });
  },
  removeEverything() {
    chrome.storage.local.clear();
    CliqzChromeDB.size();
  },
};

export default class {
  constructor(CliqzSecureMessage) {
    this.CliqzSecureMessage = CliqzSecureMessage;
  }

  close() {
  }

  saveRecord(id, data) {
    CliqzChromeDB.set('hpn', id, data);
  }

  loadRecord(id) {
    const promise = new Promise((resolve) => {
      CliqzChromeDB.get('hpn', id, (obj) => {
        const res = [];
        if (obj) res.push(obj);
        resolve(res);
      });
    });
    return promise;
  }

  saveKeys(_data) {
    return new Promise((resolve) => {
      CliqzChromeDB.set('hpn', 'userKey', JSON.stringify(_data));
      resolve({ status: true, data: _data });
    });
  }

  loadKeys() {
    return new Promise((resolve) => {
      this.loadRecord('userKey')
        .then((data) => {
          if (data.length === 0) {
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

  saveLocalCheckTable() {
    if (Object.keys(this.CliqzSecureMessage.localTemporalUniq).length > 0) {
      this.saveRecord('localTemporalUniq', JSON.stringify(this.CliqzSecureMessage.localTemporalUniq));
    }
  }

  loadLocalCheckTable() {
    this.loadRecord('localTemporalUniq')
      .then((res) => {
        if (res.length > 0) {
          this.CliqzSecureMessage.localTemporalUniq = JSON.parse(res[0]);
        } else {
          this.CliqzSecureMessage.localTemporalUniq = {};
        }
      });
  }
}
