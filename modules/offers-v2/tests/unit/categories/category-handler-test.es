/* global chai */
/* global describeModule */
/* global require */
/* eslint no-param-reassign: off */

let buildSimplePatternIndex;
const encoding = require('text-encoding');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const waitFor = require('../utils/waitfor');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

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

const timeMock = commonMocks['core/time'];
const DAY_MS = timeMock.DAY_MS;
const getDaysFromTimeRange = timeMock.getDaysFromTimeRange;

let CATEGORY_LIFE_TIME_SECS;

// the real tokenize url method
let tokenizeUrl;

export default describeModule('offers-v2/categories/category-handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'platform/gzip': {
      default: {}
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'offers-v2/utils': {
      timestampMS: function () {
        return timeMock.timestamp();
      },
    },
    'offers-v2/features/history-feature': {
      default: class {
        constructor() {
          this.dayData = [];
        }

        getName() { return 'history'; }

        init() { return true; }

        unload() { return true; }

        isAvailable() { return true; }

        hasCachedData() { return Promise.resolve({}); }

        performQuery(q) {
          // q = {
          //   patterns: category.getPatterns(),
          //   pid: category.getName(),
          //   start_ms: now - (category.getTimeRangeSecs() * 1000),
          //   end_ms: now
          // };
          const dayList = getDaysFromTimeRange(q.start_ms, q.end_ms);
          // * {
          // *   match_data: {
          // *     total: {
          // *       // total of number of days we have info regarding this entry
          // *       num_days: N,
          // *       // the total number of matches on those days
          // *       m: M,
          // *       // the total number of urls we checked on history on those days for this
          // *       // particular pattern.
          // *       c: X,
          // *       // the last timestamp of the last url we have checked (it can be that
          // *       // is not in the query of those days).
          // *       last_checked_url_ts: T,
          // *     },
          // *     per_day: {
          // *       // we will store the data in the following format: YYYYMMDD
          // *       day_key_1: {
          // *         // the number of matches for this particular day
          // *         m: N,
          // *         // the number of urls checked on this day
          // *         c: M,
          // *         // the last time we accessed / used this day data
          // *         last_accessed_ts: X,
          // *       },
          // *       ...
          // *     }
          // *   }
          const result = {
            match_data: {
              total: {
                num_days: dayList.length,
                m: 0,
                c: 0,
                last_checked_url_ts: q.end_ms,
              },
              per_day: {},
            }
          };
          const patternIndex = buildSimplePatternIndex(q.patterns);
          dayList.forEach((day) => {
            const urls = this.dayData;
            const dayTS = day * DAY_MS;
            result.match_data.per_day[day] = { m: 0, c: urls.length, last_accessed_ts: dayTS };
            result.match_data.total.c += urls.length;
            urls.forEach((u) => {
              const turl = tokenizeUrl(u);
              if (patternIndex.match(turl)) {
                result.match_data.per_day[day].m += 1;
                result.match_data.total.m += 1;
              }
            });
          });

          return Promise.resolve({ d: result, pid: q.pid });
        }

        removeEntry() {}
      }
    },
    'offers-v2/features/geo_checker': {
      default: class {
        getName() { return 'geo'; }

        init() { return true; }

        unload() { return true; }

        isAvailable() { return false; }
      }
    }
  }),
  () => {
    describe('#category-handler-test', function () {
      let CategoryHandler;
      let sharedDB;
      let FeatureHandler;
      let Category;

      beforeEach(function () {
        persistenceMocks['core/persistence/simple-db'].reset();
        CategoryHandler = this.module().default;
        return Promise.all([
          this.system.import('offers-v2/features/feature-handler'),
          this.system.import('offers-v2/categories/category'),
          this.system.import('offers-v2/common/pattern-utils'),
        ]).then((mods) => {
          FeatureHandler = mods[0].default;
          Category = mods[1].default;
          CATEGORY_LIFE_TIME_SECS = mods[1].CATEGORY_LIFE_TIME_SECS;
          buildSimplePatternIndex = mods[2].buildSimplePatternIndex;
          tokenizeUrl = mods[2].default;
        });
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

      function waitForHistoryReady(cat) {
        return waitFor(cat.isHistoryDataSettedUp.bind(cat), 'History set up');
      }

      function waitForMultipleCatHistory(cats) {
        return Promise.all(cats.map(c => waitForHistoryReady(c)) || []);
      }

      context('basic tests', function () {
        let fh;
        let historyFeatureMock;
        let catHandler;

        beforeEach(async function () {
          timeMock.setMockedTS(Date.now());
          sharedDB = {};
          fh = new FeatureHandler();
          historyFeatureMock = fh.getFeature('history');
          catHandler = new CategoryHandler(historyFeatureMock);
          await catHandler.init(sharedDB);
          await catHandler.loadPersistentData();
        });

        afterEach(() => catHandler.persistentHelper.destroyDB());

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

        it('/cleanUp doesnt remove just added categories', function () {
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
            chai.expect(catHandler.hasCategory(c.getName())).eql(true);
          });
          catHandler.build();
          catHandler.cleanUp();
          // still exists
          cats.forEach(c => chai.expect(catHandler.hasCategory(c.getName())).eql(true));

          // after moving in time (max(+11 secs, CATEGORY_LIFE_TIME_SECS) should not exists anymore
          timeMock.setMockedTS(timeMock.getMockedTS() + 9 * 1000);
          catHandler.cleanUp();
          cats.forEach(c => chai.expect(catHandler.hasCategory(c.getName())).eql(true));
          timeMock.setMockedTS(timeMock.getMockedTS() + CATEGORY_LIFE_TIME_SECS * 1000);
          catHandler.cleanUp();
          cats.forEach(c => chai.expect(catHandler.hasCategory(c.getName())).eql(false));
        });

        it('/basic url events works 1', function () {
          const catData = [
            { name: 'c1', patterns: ['||google.com'] },
            { name: 'c2', patterns: ['||yahoo.com'] },
          ];
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          catHandler.cleanUp();
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
          catHandler.cleanUp();
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
          catHandler.cleanUp();
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
          catHandler.cleanUp();
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
          catHandler.cleanUp();

          await waitForMultipleCatHistory(cats);
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
          const catData = [
            {
              name: 'c1',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForHistoryReady(cats[0]).then(() => {
            chai.expect(catHandler.getMatchesForCategory('c1')).eql(3 * 5);
            return Promise.resolve();
          });
        });

        it('/check simple activation data works for normalized func', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 0,
              threshold: 3 / 7,
            },
          };
          const activationData2 = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 0,
              threshold: 4 / 7,
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
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          chai.expect(catHandler.isCategoryActive('c1')).eql(false);
          chai.expect(catHandler.isCategoryActive('c2')).eql(false);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            chai.expect(catHandler.isCategoryActive('c2')).eql(false);
            return Promise.resolve();
          });
        });

        // TODO: we are not using this for now
        xit('/check simple activation data works for multiple days for normalized func', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 1,
              endDayIdx: 1,
              threshold: 2 / 7,
            },
          };
          const activationData2 = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 1,
              endDayIdx: 1,
              threshold: 3 / 7,
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
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          chai.expect(catHandler.isCategoryActive('c1')).eql(false);
          chai.expect(catHandler.isCategoryActive('c2')).eql(false);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1', 'c1 failed')).eql(true);
            chai.expect(catHandler.isCategoryActive('c2', 'c2 failed')).eql(true);
            return Promise.resolve();
          });
        });

        it('/check simple activation data works for multiple days2 for normalized func', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 3,
              threshold: 2 / 7,
            },
          };
          const activationData2 = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 3,
              threshold: 3 / 7,
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
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          chai.expect(catHandler.isCategoryActive('c1')).eql(false);
          chai.expect(catHandler.isCategoryActive('c2')).eql(false);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            chai.expect(catHandler.isCategoryActive('c2')).eql(true);
            return Promise.resolve();
          });
        });

        it('/check simple activation data works for multiple days 3 for normalized func', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 0,
              threshold: 4 / 8,
            },
          };
          const catData = [
            {
              name: 'c1',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          chai.expect(catHandler.isCategoryActive('c1')).eql(false);
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);

            return Promise.resolve();
          });
        });

        it('/check activation works when changing day for normalized func', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 3,
              threshold: 2 / 7,
            },
          };
          const catData = [
            {
              name: 'c1',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            timeMock.setMockedTS(timeMock.getMockedTS() + DAY_MS);
            chai.expect(catHandler.isCategoryActive('c1'), 'v1').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v2').eql(true);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1'), 'v3').eql(true);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
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
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
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
              totNumHits: 5
            }
          };
          const catData = [{
            name: 'c1',
            patterns: ['||google.com'],
            timeRangeSecs: (1 * DAY_MS) / 1000,
            activationData: activationData
          }, {
            name: 'c2',
            patterns: ['||google.com'],
            timeRangeSecs: (0.7 * DAY_MS) / 1000,
            activationData: activationData2
          }];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
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
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
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
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 3,
              threshold: 2 / 7,
            },
          };
          const catData = [
            {
              name: 'c1.c11.c111',
              patterns: ['||google.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
          const cats = createCategories(catData);
          cats.forEach(c => catHandler.addCategory(c));
          catHandler.build();
          return waitForMultipleCatHistory(cats).then(() => {
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            timeMock.setMockedTS(timeMock.getMockedTS() + DAY_MS);
            chai.expect(catHandler.isCategoryActive('c1'), 'v1').eql(false);
            catHandler.newUrlEvent(tokenizeUrl('http://www.google.com'));
            chai.expect(catHandler.isCategoryActive('c1')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11')).eql(true);
            chai.expect(catHandler.isCategoryActive('c1.c11.c111')).eql(true);
            return Promise.resolve();
          });
        });

        it('/update categories works when version is higher', function () {
          const activationData = {
            activationTimeSecs: 10,
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 0,
              threshold: 1 / 7,
            },
          };
          let catData = [
            {
              name: 'c1',
              patterns: ['||xyz.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
              version: 1,
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
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
                timeRangeSecs: (4 * DAY_MS) / 1000,
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
            func: 'normalized',
            args: {
              startDayIdx: 0,
              endDayIdx: 0,
              threshold: 1 / 7,
            },
          };
          let catData = [
            {
              name: 'c1',
              patterns: ['||xyz.com'],
              timeRangeSecs: (4 * DAY_MS) / 1000,
              activationData,
              version: 1,
            },
          ];
          historyFeatureMock.dayData = GENERIC_HISTORY_DAY;
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
                timeRangeSecs: (4 * DAY_MS) / 1000,
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
      });
    });
  });
