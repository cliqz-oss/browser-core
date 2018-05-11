/* global chai */
/* global describeModule */
/* global require */


let mockedTS = Date.now();
let todayDayKeyMock = 20161101;

export default describeModule('offers-v2/categories/category',
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
    'core/cliqz': {
      utils: {
      },
    },
    'platform/globals': {
    },
    'platform/crypto': {
      default: {}
    },
    'core/crypto/random': {
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
      getDaysFromTimeRange: function(startTS, endTS) {
        getDaysFromTimeRangeArg = [startTS, endTS];
        return getDaysFromTimeRangeResult;
      },
      // getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) {
      //   return getDateFromDateKeyResult;
      // },
      timestamp: function() {
        return mockedTS;
      },
      getTodayDayKey: function() {
        return mockedTS / (1000 * 60 * 60 * 24);
      }
    },
    'offers-v2/utils': {
      timestampMS: function() {
        return mockedTS;
      },
    },
  }),
  () => {
    describe('#category-test', function() {
      let Category;

      beforeEach(function () {
        Category = this.module().default;
      });

      function cmpCats(c1, c2) {
        const fieldsToCompare = [
          'name',
          'patterns',
          'version',
          'getTimeRangeSecs',
          'activationData',
          'lastUpdateTs',
          'createdTs',
          'matchData',
          'lastActivationTs',
          'isHistoryDataSet'
        ];
        fieldsToCompare.forEach(f => chai.expect(c1[f], `${f} not equal`).eql(c2[f]));
      }

      context('basic tests', function () {
        beforeEach(function () {
        });

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/serialize / deserialize works 2', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          const data = c1.serialize();
          const c2 = new Category();
          c2.deserialize(data);
          chai.expect(data).to.exist;
          cmpCats(c1, c2);
        });

        it('/name version patterns works', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.getName()).eql('test');
          chai.expect(c1.getVersion()).eql(1);
          chai.expect(c1.hasPatterns()).eql(true);
          chai.expect(c1.getPatterns()).eql(['p1', 'p2']);
          chai.expect(c1.isHistoryDataSettedUp(), 'isHistoryDataSettedUp').eql(false);
          chai.expect(c1.getTimeRangeSecs()).eql(10);
          chai.expect(c1.isObsolete()).eql(false);
          chai.expect(c1.getTotalMatches()).eql(0);
          chai.expect(c1.getLastMatchTs()).eql(null);
          chai.expect(c1.getFirstMatchTs()).eql(null);
          chai.expect(c1.countDaysWithMatches()).eql(0);
        });

        it('/hit works', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.getLastMatchTs()).eql(null);
          chai.expect(c1.getFirstMatchTs()).eql(null);
          c1.hit();
          chai.expect(c1.getLastMatchTs()).eql(mockedTS);
          chai.expect(c1.getFirstMatchTs()).eql(mockedTS);
          chai.expect(c1.getTotalMatches()).eql(1);
          chai.expect(c1.countDaysWithMatches()).eql(1);
        });

        it('/hit works 2', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.getLastMatchTs()).eql(null);
          chai.expect(c1.getFirstMatchTs()).eql(null);
          c1.hit();
          const lastMockedTS = mockedTS;
          mockedTS += 25 * 60 * 60 * 1000;
          c1.hit();
          chai.expect(c1.getLastMatchTs()).eql(mockedTS);
          chai.expect(c1.getFirstMatchTs()).eql(lastMockedTS);
          chai.expect(c1.getTotalMatches()).eql(2);
          chai.expect(c1.countDaysWithMatches()).eql(2);
        });

        it('/isObsolete works', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.isObsolete()).eql(false);
          mockedTS += 9 * 1000;
          chai.expect(c1.isObsolete()).eql(false);
          mockedTS += 2 * 1000;
          chai.expect(c1.isObsolete()).eql(true);
          c1.hit();
          chai.expect(c1.isObsolete()).eql(false);
          mockedTS += 11 * 1000;
          chai.expect(c1.isObsolete()).eql(true);
        });


      });
    });
  }
);
