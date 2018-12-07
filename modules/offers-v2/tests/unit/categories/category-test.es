/* global chai */
/* global describeModule */
/* global require */
const commonMocks = require('../utils/common');

const timeMock = commonMocks['core/time'];

let CATEGORY_LIFE_TIME_SECS;

export default describeModule('offers-v2/categories/category',
  () => ({
    ...commonMocks,
    'offers-v2/utils': {
      timestampMS: function () {
        return timeMock.timestamp();
      },
    },
  }),
  () => {
    describe('#category-test', function () {
      let Category;

      beforeEach(function () {
        Category = this.module().default;
        CATEGORY_LIFE_TIME_SECS = this.module().CATEGORY_LIFE_TIME_SECS;
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
          chai.expect(c1.getLastMatchTs()).eql(timeMock.getMockedTS());
          chai.expect(c1.getFirstMatchTs()).eql(timeMock.getMockedTS());
          chai.expect(c1.getTotalMatches()).eql(1);
          chai.expect(c1.countDaysWithMatches()).eql(1);
        });

        it('/hit works 2', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.getLastMatchTs()).eql(null);
          chai.expect(c1.getFirstMatchTs()).eql(null);
          c1.hit();
          const lastMockedTS = timeMock.getMockedTS();
          timeMock.setMockedTS(timeMock.getMockedTS() + 25 * 60 * 60 * 1000);
          c1.hit();
          chai.expect(c1.getLastMatchTs()).eql(timeMock.getMockedTS());
          chai.expect(c1.getFirstMatchTs()).eql(lastMockedTS);
          chai.expect(c1.getTotalMatches()).eql(2);
          chai.expect(c1.countDaysWithMatches()).eql(2);
        });

        it('/isObsolete works', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.isObsolete()).eql(false);
          timeMock.setMockedTS(timeMock.getMockedTS() + 9 * 1000);
          chai.expect(c1.isObsolete()).eql(false);
          timeMock.setMockedTS(timeMock.getMockedTS()
            + (2 * 1000) + (CATEGORY_LIFE_TIME_SECS * 1000));
          chai.expect(c1.isObsolete()).eql(true);
          c1.hit();
          chai.expect(c1.isObsolete()).eql(false);
          timeMock.setMockedTS(timeMock.getMockedTS()
            + (1 * 1000) + (CATEGORY_LIFE_TIME_SECS * 1000));
          chai.expect(c1.isObsolete(), 'should be obsolete').eql(true);
        });
      });
    });
  });
