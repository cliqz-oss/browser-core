/* global chai */
/* global describeModule */
/* global require */
/* eslint camelcase: off */

const tldjs = require('tldjs');

const persistence = {};
function delay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject);
    }, 100);
  });
}

let shouldKeepResourceRet = false;

class BackendConnectorMock {
  constructor() {
    this.calls = [];
    this.ret = [];
  }

  sendApiRequest(endpoint, params, method = 'POST') {
    this.calls.push({ endpoint, params, method });
    return Promise.resolve(this.ret);
  }

  clear() {
    this.ret = [];
    this.calls = [];
  }
}

class IntentMock {
  constructor(n, d) {
    this.n = n;
    this.d = d;
  }
  getName() {
    return this.n;
  }
  getDurationSecs() {
    return this.d;
  }
}

class IntentHandlerMock {
  constructor() {
    this.intents = new Map();
  }
  mock_addIntent(n, d) {
    this.intents.set(n, new IntentMock(n, d));
  }
  registerCallback() {}
  unregisterCallback() {}
  activateIntent() {}
  getActiveIntents() {
    const r = [];
    this.intents.forEach((v, k) => r.push(this.intents.get(k)));
    return r;
  }
  isIntentActiveByName() {
    return false;
  }
  isIntentActive() {
    return false;
  }
  getActiveIntent(intentName) {
    return this.intents.get(intentName);
  }
}

export default describeModule('offers-v2/offers/intent-offers-handler',
  () => ({
    'offers-v2/backend-connector': {
      default: BackendConnectorMock,
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'core/prefs': {
      default: {
        get: function (x, y) { return y; }
      }
    },
    'core/platform': {
      isChromium: false
    },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: function () {
        return Date.now();
      },
      shouldKeepResource: function () {
        return shouldKeepResourceRet;
      },
    },
    'core/persistence/map': {
      default: class MockMap {
        constructor(dbName) {
          persistence[dbName] = (persistence[dbName] || new Map());
          this.db = persistence[dbName];
        }

        init() {
          return Promise.resolve();
        }

        unload() {
          return Promise.resolve();
        }

        get(key) {
          return delay(() => this.db.get(key));
        }

        set(key, value) {
          return delay(() => this.db.set(key, value));
        }

        has(key) {
          return delay(() => this.db.has(key));
        }

        delete(key) {
          return delay(() => this.db.delete(key));
        }

        clear() {
          return delay(() => this.db.clear());
        }

        size() {
          return delay(() => this.db.size());
        }

        keys() {
          return delay(() => [...this.db.keys()]);
        }

        entries() {
          return delay(() => [...this.db.entries()]);
        }
      }
    }
  }),
  () => {
    describe('general tests', function () {
      let IntentOffersHandler;
      let beConnector;
      let ihandlerMock;
      let ioh;
      beforeEach(function () {
        IntentOffersHandler = this.module().default;
      });

      describe('#basics', function () {
        function checkResult(idList) {
          const resultOffers = ioh.getOffersForIntent('intent-name');
          const resultIDs = new Set();
          resultOffers.forEach(o => resultIDs.add(o.uniqueID));
          chai.expect(resultIDs.size, 'there are more or less elements than expected').eql(idList.length);
          idList.forEach(id =>
            chai.expect(resultIDs.has(id), `missing offer id: ${id}`).eql(true)
          );
        }

        context('/validity checks', function () {
          beforeEach(function () {
            beConnector = new BackendConnectorMock();
            ihandlerMock = new IntentHandlerMock();
            ioh = new IntentOffersHandler(beConnector, ihandlerMock);
          });

          it('/check user_group undefined works', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
              },
              {
                offer_id: 'o3',
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.ret = offers;
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o2', 'o3', 'o4']);
            });
          });

          it('/check user_group filter works', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
                user_group: 1,
              },
              {
                offer_id: 'o3',
                user_group: 100,
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.ret = offers;
            shouldKeepResourceRet = false;
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o4']);
            });
          });

          it('/check user_group filter works 2', function () {
            const offers = [
              {
                offer_id: 'o1',
              },
              {
                offer_id: 'o2',
                user_group: 1,
              },
              {
                offer_id: 'o3',
                user_group: 100,
              },
              {
                offer_id: 'o4',
              }
            ];
            // configure the bemock
            beConnector.ret = offers;
            shouldKeepResourceRet = true;
            ihandlerMock.mock_addIntent('intent-name', 999);
            return ioh.fetchOffersForIntent('intent-name').then(() => {
              checkResult(['o1', 'o2', 'o3', 'o4']);
            });
          });
        });
      });
    });
  }
);
