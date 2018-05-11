// TODO: this entire file requires a rewrite from ground up
const CliqzChromeDB = {
  VERSION: '0.1',
  set: function(db, key, obj, callback) {
    var dbKey = db+':'+key;
    var o = {};
    o[dbKey] = obj;
    chrome.storage.local.set(o, callback);
  },
  get: function(db, keyValueOrFunction, callback) {

    if (typeof keyValueOrFunction === 'function') {

      chrome.storage.local.get(null, function(items) {
        var results = [];
        Object.keys(items).forEach( function(lab) {
          if (lab.startsWith(db)) {
            if (keyValueOrFunction(items[lab])) results.push(items[lab]);
          }
        });
        callback(results);
      });

    }
    else {
      var dbKey = db+':'+keyValueOrFunction;
      chrome.storage.local.get(dbKey, function(items) {
        callback(items[dbKey]);
      });
    }
  },
  remove: function(db, keyValueOrFunction, callback) {

    if (typeof keyValueOrFunction === 'function') {

      chrome.storage.local.get(null, function(items) {
        var resultsToBeRemoved = [];
        Object.keys(items).forEach( function(lab) {
          if (lab.startsWith(db)) {
            if (keyValueOrFunction(items[lab])) {
              var dbKey = db+':'+lab;
              resultsToBeRemoved.push(dbKey);
            }
          }
        });

        chrome.storage.local.remove(resultsToBeRemoved, callback)
      });

    }
    else {
      var dbKey = db+':'+keyValueOrFunction;
      chrome.storage.local.remove(dbKey, callback);
    }
  },
  size: function(callback) {
    chrome.storage.local.getBytesInUse(null, function(a) {
      var res = [a, a/chrome.storage.local.QUOTA_BYTES];
      console.log('Current size: ', res[0], res[1]);
      if (callback) callback(res);
    });
  },
  removeEverything: function() {
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
    var promise = new Promise(function(resolve, reject){
      CliqzChromeDB.get('hpn', id, function(obj) {
        var res = [];
        if (obj) res.push(obj);
        resolve(res);
      });
    });
    return promise;
  }

  saveKeys(_data) {
    return new Promise(function(resolve, reject) {
      CliqzChromeDB.set('hpn', 'userKey', JSON.stringify(_data));
      resolve({ status: true, data: _data });
    });
  }

  loadKeys() {
    return new Promise((resolve, reject) => {
      this.loadRecord('userKey')
        .then(data => {
          if (data.length === 0) {
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
    });
  }

  saveLocalCheckTable() {
    if (Object.keys(this.CliqzSecureMessage.localTemporalUniq).length > 0) {
      this.saveRecord('localTemporalUniq', JSON.stringify(this.CliqzSecureMessage.localTemporalUniq));
    }
  }

  loadLocalCheckTable() {
    this.loadRecord('localTemporalUniq')
      .then( res => {
        if(res.length > 0){
          this.CliqzSecureMessage.localTemporalUniq = JSON.parse(res[0]);
        } else {
          this.CliqzSecureMessage.localTemporalUniq = {};
        }
      })
  }
}
