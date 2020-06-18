/* global chai */
/* global describeModule */
/* global sinon */
/* eslint no-param-reassign: off */

const MockDate = require('mockdate');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const waitFor = require('../utils/waitfor');
const cloneObject = require('../utils/utils').cloneObject;

const GENERIC_CAT_DATA = {
  name: 'test-cat',
  patterns: [
    '||google.com',
    '||cliqz.com',
  ],
  version: 1,
  timeRangeSecs: 10,
  activationData: {}
};
const GENERIC_HISTORY_DAY = [
  'http://www.google.com',
  'http://www.google.com/x1',
  'http://www.google.com/x2',
  'http://www.yahoo.com',
  'http://www.facebook.com',
  'http://www.focus.com',
  'http://www.amazon.com',
];

const DAY_MS = 1000 * 60 * 60 * 24;

// the real tokenize url method
let tokenizeUrl;

export default describeModule('offers-v2/categories/category-handler',
  () => ({
    ...commonMocks,
    // Stub that user visits a set of urls each day
    'platform/history/history': {
      default: {
        queryVisitsForTimespan: async ({ frameStartsAt, frameEndsAt }) => {
          function* generate() {
            for (let ts = frameEndsAt; ts > frameStartsAt; ts -= DAY_MS) {
              for (const url of GENERIC_HISTORY_DAY) {
                yield { ts, url };
              }
            }
          }
          return [...generate()];
        }
      }
    },
  }),
  () => {
    describe('#category-handler-test', function () {
      let CategoryHandler;
      let FeatureHandler;
      let Category;
      let ThrottleError;

      beforeEach(async function () {
        persistenceMocks['core/persistence/simple-db'].reset();
        await persistenceMocks.lib.dexieReset(this.system);
        CategoryHandler = this.module().default;
        FeatureHandler = (await this.system.import('offers-v2/features/feature-handler')).default;
        const catModule = await this.system.import('offers-v2/categories/category');
        Category = catModule.default;
        tokenizeUrl = (await this.system.import('offers-v2/common/pattern-utils')).default;
        ThrottleError = (await this.system.import('offers-v2/common/throttle-with-rejection')).ThrottleError;
      });

      function createCategory(d = GENERIC_CAT_DATA, overrideName = null) {
        d = cloneObject(d);
        if (overrideName) {
          d.name = overrideName;
        }
        return new Category(d.name, d.patterns, d.version, d.timeRangeSecs, d.activationData);
      }

      function createCategories(catDataList) {
        const result = [];
        catDataList.forEach((cd) => {
          const d = cloneObject(GENERIC_CAT_DATA);
          d.name = cd.name;
          if (cd.patterns) {
            d.patterns = cd.patterns;
          }
          if (cd.timeRangeSecs) {
            d.timeRangeSecs = cd.timeRangeSecs;
          }
          if (cd.activationData) {
            d.activationData = cd.activationData;
          }
          if (cd.version) {
            d.version = cd.version;
          }
          result
            .push(new Category(d.name, d.patterns, d.version, d.timeRangeSecs, d.activationData));
        });
        return result;
      }

      context('basic tests', function () {
        let fh;
        let historyFeatureMock;
        let catHandler;
        let updateCategoryAccounting;

        beforeEach(async function () {
          fh = new FeatureHandler();
          historyFeatureMock = fh.getFeature('history');
          catHandler = new CategoryHandler(historyFeatureMock);
          await catHandler.init();
          await catHandler.loadPersistentData();
          // Categories is a mix of sync and async code. Updating categories
          // in persistence is async without await. The spy helps tests
          // to know when the updating is done.
          updateCategoryAccounting = sinon.spy(
            catHandler.persistentHelper,
            'categoryAccountingModified'
          );
          catHandler._acquireBuildResources('unittest');
        });

        async function setCategories(cats) {
          catHandler._releaseBuildResources();
          await catHandler.syncCategories(cats, { ifSyncEmpty: true });
          catHandler._acquireBuildResources('unittest');
        }

        afterEach(async () => {
          await setCategories([]);
          updateCategoryAccounting.restore();
          await MockDate.reset();
        });

        async function waitForHistoryReady(cat) {
          await catHandler._importHistoricalDataUnthrottled(cat);
          return waitFor(cat.isHistoryDataSettedUp.bind(cat), 'History set up');
        }

        function waitForMultipleCatHistory(cats) {
          return Promise.all(cats.map(c => waitForHistoryReady(c)) || []);
        }

        // // /////////////////////////////////////////////////////////////////////
        // // /////////////////////////////////////////////////////////////////////

        it('/elements exists', function () {
          chai.expect(catHandler).to.exist;
        });

        it('/has category works for invalid category', function () {
          chai.expect(catHandler.hasCategory('x')).eql(false);
        });

        it('/has category works for valid category', function () {
          const c = createCategory();
          chai.expect(catHandler.hasCategory(c.getName())).eql(false);
          catHandler.addCategory(c);
          chai.expect(catHandler.hasCategory(c.getName())).eql(true);
          catHandler.addCategory(c);
          chai.expect(catHandler.hasCategory(c.getName())).eql(true);
        });

        it('/has category works for multiple categories', function () {
          const catNames = [
            'c1',
            'c1.c11',
            'c2',
            'c2.c22.c222'
          ];
          const cats = [];
          catNames.forEach(cname => cats.push(createCategory(GENERIC_CAT_DATA, cname)));
          for (const c of cats) {
            chai.expect(catHandler.hasCategory(c.getName())).eql(false);
            catHandler.addCategory(c);
          }
          catHandler.build(new Map());
          catNames.forEach(cname => chai.expect(catHandler.hasCategory(cname)).eql(true));
        });

        it('/remove deep category', () => {
          const cname = 'level1.level2.leaf';
          const cat = createCategory(GENERIC_CAT_DATA, cname);
          catHandler.addCategory(cat);

          catHandler.removeCategory(cat);

          chai.expect(catHandler.hasCategory(cname)).eql(false);
        });

        it('/remove category works', async function () {
          const c = createCategory();
          chai.expect(catHandler.hasCategory(c.getName())).eql(false);
          await setCategories([c]);
          chai.expect(catHandler.hasCategory(c.getName())).eql(true);
          catHandler.removeCategory(c);
          chai.expect(catHandler.hasCategory(c.getName())).eql(false);

          const catNames = [
            'c1',
            'c1.c11',
            'c2',
            'c2.c22.c222'
          ];
          const cats = [];
          catNames.forEach(cname => cats.push(createCategory(GENERIC_CAT_DATA, cname)));
          for (const _c of cats) {
            chai.expect(catHandler.hasCategory(_c.getName())).eql(false);
            catHandler.addCategory(_c);
          }
          catHandler.build(new Map());
          for (const _c of cats) {
            catHandler.removeCategory(_c);
          }
          catNames.forEach(cname => chai.expect(catHandler.hasCategory(cname)).eql(false));
        });

        it('/basic url events works 1', async function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          catHandler.doDailyAccounting();
          chai.expect(cats[0].getTotalMatches()).eql(0);
          chai.expect(cats[1].getTotalMatches()).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google2.com'));

          chai.expect(cats[0].getTotalMatches()).eql(0);
          chai.expect(cats[1].getTotalMatches()).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));

          chai.expect(cats[0].getTotalMatches(), 'here!!!').eql(1);
          chai.expect(cats[1].getTotalMatches(), 'here 2').eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(cats[0].getTotalMatches()).eql(1);
          chai.expect(cats[1].getTotalMatches()).eql(1);
        });

        it('/basic url event with multiple patterns works', async function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
            { name: 'c3', patterns: ['||google.com', '||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          catHandler.doDailyAccounting();
          chai.expect(cats[0].getTotalMatches()).eql(0);
          chai.expect(cats[1].getTotalMatches()).eql(0);
          chai.expect(cats[2].getTotalMatches()).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google2.com'));

          chai.expect(cats[0].getTotalMatches()).eql(0);
          chai.expect(cats[1].getTotalMatches()).eql(0);
          chai.expect(cats[2].getTotalMatches()).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));

          chai.expect(cats[0].getTotalMatches(), 'here!!!').eql(1);
          chai.expect(cats[1].getTotalMatches(), 'here 2').eql(0);
          chai.expect(cats[2].getTotalMatches()).eql(1);

          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(cats[0].getTotalMatches()).eql(1);
          chai.expect(cats[1].getTotalMatches()).eql(1);
          chai.expect(cats[2].getTotalMatches()).eql(2);
        });

        it('/basic url event and getMatchesForCategory works', async function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
            { name: 'c3', patterns: ['||google.com', '||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          catHandler.doDailyAccounting();
          chai.expect(catHandler.getMatchesForCategory('c1')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c2')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c3')).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google2.com'));
          catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c2')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c3')).eql(2);
        });

        it('/basic url event and getMatchesForCategory for sub cat works', async function () {
          const catData = [
            { name: 'c1.c11', patterns: ['||yahoo.com'] },
            { name: 'c1.c11.c111', patterns: ['||facebook.com'] },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          catHandler.doDailyAccounting();
          chai.expect(catHandler.getMatchesForCategory('c1')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c1.c11')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c1.c11.c111')).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.google2.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c1.c11')).eql(0);
          chai.expect(catHandler.getMatchesForCategory('c1.c11.c111')).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c1.c11')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c1.c11.c111')).eql(0);

          catHandler.newUrlEvent(tokenizeUrl('http://www.facebook.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(2);
          chai.expect(catHandler.getMatchesForCategory('c1.c11')).eql(2);
          chai.expect(catHandler.getMatchesForCategory('c1.c11.c111')).eql(1);
        });

        it('/persistence data works', async function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
            { name: 'c3', patterns: ['||google.com', '||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          catHandler.doDailyAccounting();

          catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c2')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c3')).eql(2);

          await Promise.all(updateCategoryAccounting.returnValues);
          const catHandler2 = new CategoryHandler(historyFeatureMock);
          await catHandler2.init();
          // Persistent helper must be a singleton
          catHandler2.persistentHelper = catHandler.persistentHelper;
          chai.expect(catHandler2.hasCategory('c1')).eql(false);
          chai.expect(catHandler2.hasCategory('c2')).eql(false);
          chai.expect(catHandler2.hasCategory('c3')).eql(false);

          await catHandler2.loadPersistentData();
          chai.expect(catHandler2.hasCategory('c1')).eql(true);
          chai.expect(catHandler2.hasCategory('c2')).eql(true);
          chai.expect(catHandler2.hasCategory('c3')).eql(true);
          chai.expect(catHandler2.getMatchesForCategory('c1')).eql(1);
          chai.expect(catHandler2.getMatchesForCategory('c2')).eql(1);
          chai.expect(catHandler2.getMatchesForCategory('c3')).eql(2);
        });

        it('/removeCategory and addCategory affect persistence', async function () {
          const [cat1, cat2, cat3] = createCategories([
            { name: 'cat1', patterns: ['||google.com'] },
            { name: 'cat2', patterns: ['||yahoo.com'] },
            { name: 'cat3', patterns: ['||google.com', '||yahoo.com'] },
          ]);
          await setCategories([cat1, cat2]);
          catHandler._releaseBuildResources();
          await catHandler.loadPersistentData();
          chai.expect(catHandler.hasCategory('cat1')).eql(true);
          chai.expect(catHandler.hasCategory('cat2')).eql(true);
          chai.expect(catHandler.hasCategory('cat3')).eql(false);

          // Delete `cat1` and add `cat3`
          await setCategories([cat2, cat3]);

          catHandler._releaseBuildResources();
          await catHandler.loadPersistentData();
          chai.expect(catHandler.hasCategory('cat1'), 'cat1 is removed').eql(false);
          chai.expect(catHandler.hasCategory('cat2')).eql(true);
          chai.expect(catHandler.hasCategory('cat3'), 'cat3 is added').eql(true);
        });

        it('/check history works', async function () {
          const catData = {
            name: 'c42',
            patterns: ['||google.com'],
            timeRangeSecs: (4 * DAY_MS) / 1000
          };
          const cats = createCategories([catData]);
          await setCategories(cats);
          const cat = cats[0];
          return waitForHistoryReady(cat).then(() => {
            chai.expect(catHandler.getMatchesForCategory('c42')).eql(3 * 5);
            return Promise.resolve();
          });
        });

        it('/check activation works for simpleCount func for numDays', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              numDays: 6,
            },
          };
          const activationData2 = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              numDays: 5,
            },
          };
          const catData = [
            {
              name: 'c1',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
            },
            {
              name: 'c2',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData: activationData2,
            },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          chai.expect(catHandler.isCategoryActive('c1'), 'c1 first check').eql(false);
          chai.expect(catHandler.isCategoryActive('c2'), 'c2 first check').eql(false);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1'), 'c1 snd check').eql(false);
            chai.expect(catHandler.isCategoryActive('c1'), 'v1').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v2').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c2'), 'v3').eql(true);
            return Promise.resolve();
          });
        });

        it('/check activation works for simpleCount func for totNumHits', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 7
            }
          };
          const activationData2 = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 8
            }
          };
          const catData = [{
            name: 'c1',
            patterns: ['||google.com'], // 3x in GENERIC_HISTORY_DAY
            timeRangeSecs: DAY_MS / 1000, // two complete days
            activationData: activationData
          }, {
            name: 'c2',
            patterns: ['||google.com'],
            timeRangeSecs: DAY_MS / 1000,
            activationData: activationData2
          }];
          const cats = createCategories(catData);
          await setCategories(cats);
          chai.expect(catHandler.isCategoryActive('c1'), 'c1 first check').eql(false);
          chai.expect(catHandler.isCategoryActive('c2'), 'c2 first check').eql(false);
          return waitForMultipleCatHistory(cats).then(function () {
            chai.expect(catHandler.isCategoryActive('c1'), 'c1 snd check').eql(false);
            chai.expect(catHandler.isCategoryActive('c2'), 'c2 snd check').eql(false);
            // 1 hit for c1 2 for c2
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v1').eql(true);
            chai.expect(catHandler.isCategoryActive('c2'), 'v1.2').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), '2.v1').eql(true);
            chai.expect(catHandler.isCategoryActive('c2'), '2.v1.2').eql(true);
            return Promise.resolve();
          });
        });

        it('/check activation works for simpleCount func for totNumHits & numDays', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 8,
              numDays: 2,
            }
          };
          const catData = [{
            name: 'c1',
            patterns: ['||google.com'],
            timeRangeSecs: (1 * DAY_MS) / 1000,
            activationData: activationData
          }];
          const cats = createCategories(catData);
          await setCategories(cats);
          chai.expect(catHandler.isCategoryActive('c1'), 'c1 first check').eql(false);
          return waitForMultipleCatHistory(cats).then(function () {
            chai.expect(catHandler.isCategoryActive('c1'), 'c1 snd check').eql(false);
            // increment one day
            // mockedTS += DAY_MS;
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v1').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v1.2').eql(true);
            return Promise.resolve();
          });
        });

        it('/check activation works for categories tree', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 1
            }
          };
          const catData = [
            { name: 'c1', patterns: [] },
            { name: 'c1.c11', patterns: [] },
            {
              name: 'c1.c11.c111',
              patterns: ['||google.com'],
              timeRangeSecs: DAY_MS / 1000,
              activationData,
            },
          ];
          const cats = createCategories(catData);
          await setCategories(cats);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11.c111')).eql(true);
            return Promise.resolve();
          });
        });

        it('/update categories works when version is higher', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 1
            }
          };
          let catData = [
            {
              name: 'c1',
              patterns: ['||xyz.com'],
              timeRangeSecs: DAY_MS / 1000,
              activationData,
              version: 1,
            },
          ];
          let cats = createCategories(catData);
          await setCategories(cats);
          return waitForMultipleCatHistory(cats).then(async () => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(false);

            // replace it
            catData = [
              {
                name: 'c1',
                patterns: ['||google.com'],
                timeRangeSecs: DAY_MS / 1000,
                activationData,
                version: 2
              },
            ];
            cats = createCategories(catData);
            await setCategories(cats);
            return waitForMultipleCatHistory(cats).then(() => {
              chai.expect(catHandler.isCategoryActive('c1')).eql(true);
              return Promise.resolve();
            });
          });
        });

        it('/update categories doesnt update if version is lower', async function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 7
            }
          };
          let catData = [
            {
              name: 'c1',
              patterns: ['||xyz.com'],
              timeRangeSecs: 777,
              activationData,
              version: 1,
            },
          ];
          let cats = createCategories(catData);
          await setCategories(cats);
          return waitForMultipleCatHistory(cats).then(async () => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(false);

            // replace it
            catData = [
              {
                name: 'c1',
                patterns: ['||google.com'],
                timeRangeSecs: DAY_MS / 1000,
                activationData,
                version: 1
              },
            ];
            cats = createCategories(catData);
            await setCategories(cats);
            // check the category is the old one
            const cat = catHandler.getCategory('c1');
            chai.expect(cat.timeRangeSecs).eql(777);
          });
        });

        it('/throttle loading of history data', async () => {
          const cat = createCategory();
          catHandler.addCategory(cat);
          await catHandler.importHistoricalData(cat);

          await chai.expect(
            catHandler.importHistoricalData(cat)
          )

            .to.be.eventually.rejectedWith(ThrottleError);
        });

        context('/daily accounting', () => {
          let accountingMock;
          // let catHandler;
          beforeEach(() => {
            const cat = createCategory();
            catHandler.addCategory(cat);
            accountingMock = sinon.stub(cat, 'cleanUp');
          });

          afterEach(() => {
            MockDate.reset();
          });

          it('do nothing if accounting is already done this day', () => {
            MockDate.set(Date.now());
            catHandler.doDailyAccounting();

            catHandler.doDailyAccounting();
            catHandler.doDailyAccounting();
            catHandler.doDailyAccounting();

            chai.expect(accountingMock).to.be.calledOnce;
          });

          it('do accounting on the next day', () => {
            MockDate.set(Date.now());
            catHandler.doDailyAccounting();

            MockDate.set(Date.now() + DAY_MS);
            catHandler.doDailyAccounting();

            chai.expect(accountingMock).to.be.calledTwice;
          });
        });

        context('/learn targeting', () => {
          it('/do not fail on missed parameters or category', () => {
            catHandler.learnTargeting('no-such-category');
          });

          it('/hit a targeting category', () => {
            const cat = createCategory(GENERIC_CAT_DATA, 'Segment.AmazonPrime');
            catHandler.addCategory(cat);
            const hitMock = sinon.stub(cat, 'hit');

            catHandler.learnTargeting('AmazonPrime');

            chai.expect(hitMock).to.be.calledOnce;
          });
        });

        context('/update categories from backend', () => {
          let cat1;
          let cat3;
          beforeEach(async () => {
            const cats = createCategories([
              { name: 'cat1' },
              { name: 'cat2' },
              { name: 'cat3' },
              { name: 'cat4' },
            ]);
            await setCategories(cats);
            cat1 = cats[0];
            cat3 = cats[2];
            catHandler._releaseBuildResources();
          });

          function getCategoryNames() {
            return catHandler.catTree
              .getAllSubCategories('')
              .map(node => node.name);
          }

          it('/delete categories that are not on backend', async () => {
            await setCategories([cat1, cat3]);

            chai.expect(getCategoryNames().sort()).to.eql(['', 'cat1', 'cat3']);
          });

          it('/retain categories if backend provided no update', async () => {
            catHandler._releaseBuildResources();
            await catHandler.syncCategories([]);

            chai.expect(getCategoryNames().sort()).to.eql(
              ['', 'cat1', 'cat2', 'cat3', 'cat4']
            );
          });

          it('/provide patterns of all categories to adblocker wrapper, not only delta', async () => {
            // eslint-disable-next-line no-shadow
            const cat1 = { name: 'cat1', version: '1', patterns: ['||pattern1.de$script'] };
            const cat2 = { name: 'cat2', version: '2', patterns: ['||pattern2.de$script'] };
            catHandler._releaseBuildResources();
            await catHandler.syncCategories(createCategories([cat1, cat2]));

            const cat2updated = { name: 'cat2', version: '3', patterns: ['||pattern2updated.de$script'] };
            await catHandler.syncCategories(createCategories([cat1, cat2updated]));

            const index = catHandler.catMatch.getIndex();
            const storedPatterns = [...index.id2pattern.values()];
            storedPatterns.sort();
            chai.expect(storedPatterns).to.eql([cat1.patterns[0], cat2updated.patterns[0]]);
          });
        });
      });
    });
  });
