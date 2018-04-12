/* global chai */
/* global describeModule */
/* global require */


class BEConnectorMock {
  constructor() {
    this.result = {};
    this.lastCallEndpoint = null;
    this.lastCallParams = null;
    this.called = false;
  }
  sendApiRequest(endpoint, params) {
    this.lastCallParams = params;
    this.lastCallEndpoint = endpoint;
    this.called = true;
    return Promise.resolve(this.result);
  }
}

class CategoryHandlerMock {
  constructor() {
    this.categoriesAdded = [];
  }
  addCategory(cat) {
    this.categoriesAdded.push(cat);
  }
  build() {}
}

const DEFAULT_CAT_RESP = {
    "categories": [{
        "name": "tempcat_Flaconi12_TG1",
        "timeRangeSecs": 900,
        "patterns": ["||google.de^*abdeckstift^", "||google.de^*abschminktuecher^"],
        "revHash": "d819e9016e",
        "activationData": {
            "activationTimeSecs": 1800,
            "args": {
                "totNumHits": 1
            },
            "func": "simpleCount"
        }
    }, {
        "name": "tempcat_Flaconi18_TG1",
        "timeRangeSecs": 900,
        "patterns": ["||douglas.de", "||parfumdreams.de"],
        "revHash": "e3f609fecb",
        "activationData": {
            "activationTimeSecs": 1800,
            "args": {
                "totNumHits": 1
            },
            "func": "simpleCount"
        }
    }, {
        "name": "tempcat_NissanQQSustain_TG1",
        "timeRangeSecs": 900,
        "patterns": ["||google.de^*nissan^", "||google.de^*nissan^neu^"],
        "revHash": "61b85c246b",
        "activationData": {
            "activationTimeSecs": 1800,
            "args": {
                "totNumHits": 1
            },
            "func": "simpleCount"
        }
    }, {
        "name": "tempcat_Rossmann_TG1",
        "timeRangeSecs": 900,
        "patterns": ["||google.de^*argireline^günstig^rossmann^"],
        "revHash": "1f014ba9eb",
        "activationData": {
            "activationTimeSecs": 1800,
            "args": {
                "totNumHits": 1
            },
            "func": "simpleCount"
        }
    }, {
        "name": "tempcat_MacTrade_TG1",
        "timeRangeSecs": 900,
        "patterns": ["||google.de^*argireline^günstig^rossmann^"],
        "revHash": "cff0c4ef2d",
        "activationData": {
            "activationTimeSecs": 1800,
            "args": {
                "totNumHits": 1
            },
            "func": "simpleCount"
        }
    }],
    "revision": "79e5e5877928cc1681c6a06b392047dad0f57c8642c93a39affed60335f6863a"
};

export default describeModule('offers-v2/categories/category-fetcher',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: (x) => {console.log(x);},
        error: (x) => {console.log(x);},
        info: (x) => {console.log(x);},
        log: (x) => {console.log(x);},
        warn: (x) => {console.log(x);},
        logObject: () => {console.log(x);},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/utils': {
      default: {
        setTimeout: function(f, t) { f(); },
        getPref: function(v,d) { return d; },
      },
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'core/persistence/simple-db': {
      default: class {
        constructor(db) {
          this.db = db;
        }
        upsert(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = JSON.parse(JSON.stringify(docData));
            resolve();
          });
        }
        get(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            if (self.db[docID]) {
              resolve(JSON.parse(JSON.stringify(self.db[docID])));
            } else {
              resolve(null);
            }
          });
        }
        remove(docID) {}
      }
    },
    'platform/globals': {
    },
    'platform/gzip': {
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'platform/places-utils': {
      default: {}
    },
    'platform/history-manager': {
      default: {}
    },
    'platform/crypto': {
      default: {}
    },
    'platform/console': {
      default: {}
    },
    'core/prefs': {
      default: {
        get: function(x,y) {
          return y;
        }
      }
    },
    'core/time': {
      getTodayDayKey: function() {
        return 1;
      }
    }
  }),
  () => {
    describe('#category-fetcher', function() {
      let CategoryFetcher;

      beforeEach(function () {
        CategoryFetcher = this.module().default;
      });

      context('basic tests', function () {
        let beMock;
        let handlerMock;
        let db;
        let fetcher;

        beforeEach(function () {
          db = {};
          beMock = new BEConnectorMock();
          handlerMock = new CategoryHandlerMock();
          fetcher = new CategoryFetcher(beMock, handlerMock, db);
        });

        function waitForCondition(f) {
          return new Promise((resolve) => {
            const wait = () => {
              setTimeout(() => {
                if (f()) {
                  resolve(true);
                  return;
                } else {
                  wait();
                }
              }, 10);
            };
            wait();
          });
        }

        function waitForBECalled() {
          return waitForCondition(() => beMock.called);
        }

        function waitForCategoriesAdded(count) {
          return waitForCondition(() => handlerMock.categoriesAdded.length >= count);
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/element exists', function () {
          chai.expect(fetcher).to.exist;
        });

        it('/endpoint is properly called', function () {
          chai.expect(beMock.lastCallEndpoint).to.not.exist;
          chai.expect(beMock.lastCallParams).to.not.exist;
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.lastCallEndpoint).to.exist;
            chai.expect(beMock.lastCallParams).to.exist;
          });
        });

        it('/categories are properly added when returned', function () {
          beMock.result = DEFAULT_CAT_RESP;
          fetcher.init();
          return waitForCategoriesAdded(5).then(() => {
            chai.expect(beMock.lastCallEndpoint).to.exist;
            chai.expect(beMock.lastCallParams).to.exist;
            chai.expect(DEFAULT_CAT_RESP.categories.length).eql(handlerMock.categoriesAdded.length);
          });
        });

        it('/check revision is sent with the latest data from be', function () {
          beMock.result = DEFAULT_CAT_RESP;
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.lastCallEndpoint).to.exist;
            chai.expect(beMock.lastCallParams).to.exist;
            chai.expect(beMock.lastCallParams.last_rev).eql(null);
            beMock.called = false;
            return Promise.all([fetcher._performFetch(), waitForBECalled()]).then(() => {
              chai.expect(beMock.lastCallParams.last_rev).eql(DEFAULT_CAT_RESP.revision);
            });
          });
        });

        it('/check if no categories are returned nothing happens', function () {
          beMock.result = [];
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.lastCallEndpoint).to.exist;
            chai.expect(beMock.lastCallParams).to.exist;
            chai.expect(beMock.lastCallParams.last_rev).eql(null);
            chai.expect(handlerMock.categoriesAdded.length).eql(0);
          });
        });

        // TODOs: Extra tests
        // - check the categories are properly built when fetched
        // - check invalid categories are not being added to the category handler

      });
    });
  }
);
