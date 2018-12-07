/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const beMocks = require('../utils/offers/intent');
const waitFor = require('../utils/waitfor');

const BackendConnectorMock = beMocks['offers-v2/backend-connector'].BackendConnectorMock;
const CategoryHandlerMock = beMocks['offers-v2/backend-connector'].CategoryHandlerMock;
let shouldKeepResourceRet = false;

const DEFAULT_CAT_RESP = {
  categories: [{
    user_group: 100,
    name: 'tempcat_Flaconi12_TG1',
    timeRangeSecs: 900,
    patterns: ['||google.de^*abdeckstift^', '||google.de^*abschminktuecher^'],
    revHash: 'd819e9016e',
    activationData: {
      activationTimeSecs: 1800,
      args: {
        totNumHits: 1
      },
      func: 'simpleCount'
    }
  }, {
    user_group: 50,
    name: 'tempcat_Flaconi18_TG1',
    timeRangeSecs: 900,
    patterns: ['||douglas.de', '||parfumdreams.de'],
    revHash: 'e3f609fecb',
    activationData: {
      activationTimeSecs: 1800,
      args: {
        totNumHits: 1
      },
      func: 'simpleCount'
    }
  }, {
    user_group: 30,
    name: 'tempcat_NissanQQSustain_TG1',
    timeRangeSecs: 900,
    patterns: ['||google.de^*nissan^', '||google.de^*nissan^neu^'],
    revHash: '61b85c246b',
    activationData: {
      activationTimeSecs: 1800,
      args: {
        totNumHits: 1
      },
      func: 'simpleCount'
    }
  }, {
    name: 'tempcat_Rossmann_TG1',
    timeRangeSecs: 900,
    patterns: ['||google.de^*argireline^günstig^rossmann^'],
    revHash: '1f014ba9eb',
    activationData: {
      activationTimeSecs: 1800,
      args: {
        totNumHits: 1
      },
      func: 'simpleCount'
    }
  }, {
    name: 'tempcat_MacTrade_TG1',
    timeRangeSecs: 900,
    patterns: ['||google.de^*argireline^günstig^rossmann^'],
    revHash: 'cff0c4ef2d',
    activationData: {
      activationTimeSecs: 1800,
      args: {
        totNumHits: 1
      },
      func: 'simpleCount'
    }
  }],
  revision: '79e5e5877928cc1681c6a06b392047dad0f57c8642c93a39affed60335f6863a'
};

export default describeModule('offers-v2/categories/category-fetcher',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'offers-v2/utils': {
      shouldKeepResource: function () {
        return shouldKeepResourceRet;
      },
      timestampMS: function () {
        return Date.now();
      },
    },
    'platform/gzip': {
    },
    'core/http': {
      default: {}
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
    'core/time': {
      getTodayDayKey: function () {
        return 1;
      }
    },
    'core/helpers/timeout': {
      default: () => false, // setTimeoutInterval, don't start periodic fetch
    },
    'core/timers': {
      setTimeout: cb => cb(),
    },
    'offers-v2/categories/initial-categories': {
      default: () => [],
    }
  }),
  () => {
    describe('#category-fetcher', function () {
      let CategoryFetcher;

      beforeEach(function () {
        CategoryFetcher = this.module().default;
        persistenceMocks['core/persistence/simple-db'].reset();
      });

      context('basic tests', function () {
        let beMock;
        let handlerMock;
        let db;
        let fetcher;

        beforeEach(function () {
          shouldKeepResourceRet = true;
          db = {};
          beMock = new BackendConnectorMock();
          handlerMock = new CategoryHandlerMock();
          fetcher = new CategoryFetcher(beMock, handlerMock, db);
        });

        function waitForBECalled() {
          return waitFor(beMock.isCalled.bind(beMock));
        }

        function waitForCategoriesAdded(count) {
          return waitFor(() => handlerMock.categoriesAdded.length >= count);
        }

        function checkCategoriesAdded(idList) {
          const catIds = new Set();
          handlerMock.categoriesAdded.forEach(c => catIds.add(c.name));
          chai.expect(catIds.size, 'there are more or less elements than expected').eql(idList.length);
          idList.forEach(id =>
            chai.expect(catIds.has(id), `missing category id: ${id}`).eql(true));
        }

        function getCatNamesWithUndefinedUserGroup(catList) {
          const r = [];
          catList.forEach((c) => {
            if (c.user_group === undefined) {
              r.push(c.name);
            }
          });
          return r;
        }
        function getCatNamesWithDefinedUserGroup(catList) {
          const r = [];
          catList.forEach((c) => {
            if (c.user_group !== undefined) {
              r.push(c.name);
            }
          });
          return r;
        }

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/element exists', function () {
          chai.expect(fetcher).to.exist;
        });

        it('/endpoint is properly called', function () {
          chai.expect(beMock.getLastCallEndpoint()).to.not.exist;
          chai.expect(beMock.getLastCallParams()).to.not.exist;
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.getLastCallEndpoint()).to.exist;
            chai.expect(beMock.getLastCallParams()).to.exist;
          });
        });

        it('/categories are properly added when returned', function () {
          beMock.setMockResult(DEFAULT_CAT_RESP);
          fetcher.init();
          return waitForCategoriesAdded(5).then(() => {
            chai.expect(beMock.getLastCallEndpoint()).to.exist;
            chai.expect(beMock.getLastCallParams()).to.exist;
            chai.expect(DEFAULT_CAT_RESP.categories.length).eql(handlerMock.categoriesAdded.length);
          });
        });

        it('/check revision is sent with the latest data from be', function () {
          beMock.setMockResult(DEFAULT_CAT_RESP);
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.getLastCallEndpoint()).to.exist;
            chai.expect(beMock.getLastCallParams()).to.exist;
            chai.expect(beMock.getLastCallParams().last_rev).eql(null);
            beMock.clear();
            beMock.setMockResult(DEFAULT_CAT_RESP);
            return Promise.all([fetcher._performFetch(), waitForBECalled()]).then(() => {
              chai.expect(beMock.getLastCallParams().last_rev).eql(DEFAULT_CAT_RESP.revision);
            });
          });
        });

        it('/check if no categories are returned nothing happens', function () {
          beMock.setMockResult([]);
          fetcher.init();
          return waitForBECalled().then(() => {
            chai.expect(beMock.getLastCallEndpoint()).to.exist;
            chai.expect(beMock.getLastCallParams()).to.exist;
            chai.expect(beMock.getLastCallParams().last_rev).eql(null);
            chai.expect(handlerMock.categoriesAdded.length).eql(0);
          });
        });

        it('/check user_group filtering works for undefined', function () {
          beMock.setMockResult(DEFAULT_CAT_RESP);
          fetcher.init();
          const catWithUndefinedUserGroup = getCatNamesWithUndefinedUserGroup(
            DEFAULT_CAT_RESP.categories
          );
          chai.expect(catWithUndefinedUserGroup.length).not.eql(0);
          shouldKeepResourceRet = false;
          return waitForBECalled().then(() => {
            beMock.clear();
            beMock.setMockResult(DEFAULT_CAT_RESP);
            return Promise.all([fetcher._performFetch(), waitForBECalled()]).then(() => {
              checkCategoriesAdded(catWithUndefinedUserGroup);
            });
          });
        });


        it('/check user_group filtering works for not undefined', function () {
          beMock.setMockResult(DEFAULT_CAT_RESP);
          fetcher.init();
          const catWithUndefinedUserGroup = getCatNamesWithUndefinedUserGroup(
            DEFAULT_CAT_RESP.categories
          );
          const catWithDefinedUserGroup = getCatNamesWithDefinedUserGroup(
            DEFAULT_CAT_RESP.categories
          );
          chai.expect(catWithUndefinedUserGroup.length).not.eql(0);
          chai.expect(catWithDefinedUserGroup.length).not.eql(0);
          const all = catWithUndefinedUserGroup.concat(catWithDefinedUserGroup);
          shouldKeepResourceRet = true;
          return waitForBECalled().then(() => {
            beMock.clear();
            beMock.setMockResult(DEFAULT_CAT_RESP);
            return Promise.all([fetcher._performFetch(), waitForBECalled()]).then(() => {
              checkCategoriesAdded(all);
            });
          });
        });

        // TODOs: Extra tests
        // - check the categories are properly built when fetched
        // - check invalid categories are not being added to the category handler
      });
    });
  });
