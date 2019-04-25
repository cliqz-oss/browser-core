/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
/* eslint no-param-reassign: off */

const MockDate = require('mockdate');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const waitFor = require('../utils/waitfor');

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
    ...persistenceMocks,
    'core/url': {},
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
    }
  }),
  () => {
    describe('#category-handler-test', function () {
      let CategoryHandler;
      let sharedDB;
      let FeatureHandler;
      let Category;
      let ThrottleError;

      beforeEach(async function () {
        persistenceMocks['core/persistence/simple-db'].reset();
        CategoryHandler = this.module().default;
        FeatureHandler = (await this.system.import('offers-v2/features/feature-handler')).default;
        const catModule = await this.system.import('offers-v2/categories/category');
        Category = catModule.default;
        tokenizeUrl = (await this.system.import('offers-v2/common/pattern-utils')).default;
        ThrottleError = (await this.system.import('offers-v2/common/throttle-with-rejection')).ThrottleError;
      });


      function copyData(d) { return JSON.parse(JSON.stringify(d)); }

      function createCategory(d = GENERIC_CAT_DATA, overrideName = null) {
        d = copyData(d);
        if (overrideName) {
          d.name = overrideName;
        }
        return new Category(d.name, d.patterns, d.version, d.timeRangeSecs, d.activationData);
      }

      function createCategories(catDataList) {
        const result = [];
        catDataList.forEach((cd) => {
          const d = copyData(GENERIC_CAT_DATA);
          d.name = cd.name;
          d.patterns = cd.patterns;
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

        beforeEach(async function () {
          sharedDB = { remove: () => {} };
          fh = new FeatureHandler();
          historyFeatureMock = fh.getFeature('history');
          catHandler = new CategoryHandler(historyFeatureMock);
          await catHandler.init(sharedDB);
          await catHandler.loadPersistentData();
        });

        afterEach(async () => {
          await catHandler.persistentHelper.destroyDB();
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
          cats.forEach((c) => {
            chai.expect(catHandler.hasCategory(c.getName())).eql(false);
            catHandler.addCategory(c);
          });
          catHandler.build();
          catNames.forEach(cname => chai.expect(catHandler.hasCategory(cname)).eql(true));
        });

        it('/remove category works', function () {
          const c = createCategory();
          chai.expect(catHandler.hasCategory(c.getName())).eql(false);
          catHandler.addCategory(c);
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
          cats.forEach((_c) => {
            chai.expect(catHandler.hasCategory(_c.getName())).eql(false);
            catHandler.addCategory(_c);
          });
          catHandler.build();
          cats.forEach(_c => catHandler.removeCategory(_c));
          catNames.forEach(cname => chai.expect(catHandler.hasCategory(cname)).eql(false));
        });

        it('/basic url events works 1', function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
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

        it('/basic url event with multiple patterns works', function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
            { name: 'c3', patterns: ['||google.com', '||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
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

        it('/basic url event and getMatchesForCategory works', function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
            { name: 'c3', patterns: ['||google.com', '||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
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

        it('/basic url event and getMatchesForCategory for sub cat works', function () {
          const catData = [
            { name: 'c1.c11', patterns: ['||yahoo.com'] },
            { name: 'c1.c11.c111', patterns: ['||facebook.com'] },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
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
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          catHandler.doDailyAccounting();

          catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
          catHandler.newUrlEvent(tokenizeUrl('http://www.yahoo.com'));

          chai.expect(catHandler.getMatchesForCategory('c1')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c2')).eql(1);
          chai.expect(catHandler.getMatchesForCategory('c3')).eql(2);

          await catHandler.persistentHelper.unloadDB();

          const catHandler2 = new CategoryHandler(historyFeatureMock);
          await catHandler2.init(sharedDB);
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

        it('/check history works', function () {
          const catData = {
            name: 'c42',
            patterns: ['||google.com'],
            timeRangeSecs: (4 * DAY_MS) / 1000
          };
          const [cat] = createCategories([catData]);
          catHandler.addCategory(cat);
          catHandler.build();
          return waitForHistoryReady(cat).then(() => {
            chai.expect(catHandler.getMatchesForCategory('c42')).eql(3 * 5);
            return Promise.resolve();
          });
        });

        it('/check activation works for simpleCount func for numDays', function () {
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
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
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

        it('/check activation works for simpleCount func for totNumHits', function () {
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
          cats.forEach(function (c) {
            return catHandler.addCategory(c);
          });
          catHandler.build();
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

        it('/check activation works for simpleCount func for totNumHits & numDays', function () {
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
          cats.forEach(function (c) {
            return catHandler.addCategory(c);
          });
          catHandler.build();
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

        it('/check activation works for categories tree', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'simpleCount',
            args: {
              totNumHits: 1
            }
          };
          const catData = [
            {
              name: 'c1.c11.c111',
              patterns: ['||google.com'],
              timeRangeSecs: DAY_MS / 1000,
              activationData,
            },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11.c111')).eql(true);
            return Promise.resolve();
          });
        });

        it('/update categories works when version is higher', function () {
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
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForMultipleCatHistory(cats).then(() => {
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
            cats.forEach(c => catHandler.addCategory(c));
            catHandler.build();
            return waitForMultipleCatHistory(cats).then(() => {
              chai.expect(catHandler.isCategoryActive('c1')).eql(true);
              return Promise.resolve();
            });
          });
        });

        it('/update categories doesnt update if version is lower', function () {
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
              timeRangeSecs: DAY_MS / 1000,
              activationData,
              version: 1,
            },
          ];
          let cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForMultipleCatHistory(cats).then(() => {
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
            cats.forEach(c => catHandler.addCategory(c));
            catHandler.build();
            // check the category is the old one
            const cat = catHandler.getCategory('c1');
            chai.expect(cat.getPatterns()).eql(['||xyz.com']);
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
          beforeEach(() => {
            const cats = createCategories([
              { name: 'cat1' },
              { name: 'cat2' },
              { name: 'cat3' },
              { name: 'cat4' },
            ]);
            cats.forEach(cat => catHandler.addCategory(cat));
            cat1 = cats[0];
            cat3 = cats[2];
          });

          function getCategoryNames() {
            return catHandler.catTree
              .getAllSubCategories('')
              .map(node => node.name);
          }

          it('/delete categories that are not on backend', () => {
            catHandler.syncCategories([cat1, cat3]);

            chai.expect(getCategoryNames().sort()).to.eql(['', 'cat1', 'cat3']);
          });

          it('/retain categories if backend provided no update', () => {
            catHandler.syncCategories([]);

            chai.expect(getCategoryNames().sort()).to.eql(
              ['', 'cat1', 'cat2', 'cat3', 'cat4']
            );
          });
        });
      });
    });
  });
