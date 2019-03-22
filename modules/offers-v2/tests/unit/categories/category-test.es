/* global chai */
/* global describeModule */
/* global require */
const MockDate = require('mockdate');
const commonMocks = require('../utils/common');

let CATEGORY_LIFE_TIME_SECS;

export default describeModule('offers-v2/categories/category',
  () => ({
    ...commonMocks,
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
          const someDate = '2018-11-25';
          MockDate.set(someDate);
        });

        afterEach(function () {
          MockDate.reset();
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
          chai.expect(c1.getLastMatchTs()).eql(Date.now());
          chai.expect(c1.getFirstMatchTs()).eql(Date.now());
          chai.expect(c1.getTotalMatches()).eql(1);
          chai.expect(c1.countDaysWithMatches()).eql(1);
        });

        it('/hit works 2', function () {
          const c1 = new Category('test', ['p1', 'p2'], 1, 10);
          chai.expect(c1.getLastMatchTs()).eql(null);
          chai.expect(c1.getFirstMatchTs()).eql(null);
          c1.hit();
          const lastMockedTS = Date.now();
          MockDate.set(lastMockedTS + 25 * 60 * 60 * 1000);
          c1.hit();
          chai.expect(c1.getLastMatchTs()).eql(Date.now());
          chai.expect(c1.getFirstMatchTs()).eql(lastMockedTS);
          chai.expect(c1.getTotalMatches()).eql(2);
          chai.expect(c1.countDaysWithMatches()).eql(2);
        });
      });

      describe('/Category::probe', () => {
        let cat;

        beforeEach(() => {
          cat = new Category(
            'someCat',
            [], // patterns
            1, // version
            CATEGORY_LIFE_TIME_SECS // timeRangeSecs
          );
        });

        it('/do not match if empty created, ask for historical data', () => {
          const [isMatched, confidence] = cat.probe();

          chai.expect(isMatched, 'category matched').to.be.false;
          chai.expect(confidence).to.eq(0);
        });

        it('/do not match historically empty category', () => {
          cat.updateWithHistoryData({ per_day: [] });

          const [isMatched, confidence] = cat.probe();

          chai.expect(isMatched, 'category matched').to.be.false;
          chai.expect(confidence).to.eq(1);
        });

        it('/do not ask for historical data if matched', () => {
          cat.hit();

          const [isMatched, confidence] = cat.probe();

          chai.expect(isMatched, 'category matched').to.be.true;
          chai.expect(confidence).to.eq(1);
        });

        context('/with parameters', () => {
          const fakeNow = new Date('2018-12-11T12:00');

          beforeEach(() => {
            cat.updateWithHistoryData(
              { per_day: {
                20181209: { m: 2 },
                20181208: { m: 2 },
              } }
            );
          });

          it('/use the parameter minMatches', () => {
            let [isMatched] = cat.probe(5);
            chai.expect(isMatched, 'category matched').to.be.false;

            [isMatched] = cat.probe(3);
            chai.expect(isMatched, 'category matched').to.be.true;
          });

          it('/use the parameter durationDays', () => {
            let [isMatched] = cat.probe(/* minMatches= */ 3, /* durationDays= */ 2, fakeNow);
            chai.expect(isMatched, 'category matched').to.be.false;

            [isMatched] = cat.probe(/* minMatches= */ 3, /* durationDays= */ 3, fakeNow);
            chai.expect(isMatched, 'category matched').to.be.true;
          });
        });
      });

      context('/Category::updateWithHistoryData', () => {
        let cat;

        beforeEach(() => {
          const enoughToIncludeTestDates = (Date.now() - Date.parse('2019-01-01')) / 1000;
          cat = new Category('someCat', [], 1, enoughToIncludeTestDates);
          cat.updateWithHistoryData(
            { per_day: {
              20190108: { m: 2 },
              20190109: { m: 4 },
            } }
          );
          chai.expect(cat.matchData.total.matches).to.eq(6);
        });

        it('/history has a day which is not in accounting, add the day', () => {
          cat.updateWithHistoryData(
            { per_day: {
              20190110: { m: 10 },
            } }
          );

          chai.expect(cat.matchData.perDay).to.eql({
            20190108: { matches: 2 },
            20190109: { matches: 4 },
            20190110: { matches: 10 },
          });
          chai.expect(cat.matchData.total.matches).to.eql(16);
        });

        it('/accounting has a day which is not in history, keep accounting as is', () => {
          cat.updateWithHistoryData({ per_day: { } });

          chai.expect(cat.matchData.perDay).to.eql({
            20190108: { matches: 2 },
            20190109: { matches: 4 },
          });
          chai.expect(cat.matchData.total.matches).to.eql(6);
        });

        it('/accounting counted more matches than history, keep accounting as is', () => {
          cat.updateWithHistoryData(
            { per_day: {
              20190109: { m: 2 },
            } }
          );

          chai.expect(cat.matchData.perDay).to.eql({
            20190108: { matches: 2 },
            20190109: { matches: 4 },
          });
          chai.expect(cat.matchData.total.matches).to.eql(6);
        });

        it('/history counted more matches than accounting, add extra matches', () => {
          cat.updateWithHistoryData(
            { per_day: {
              20190109: { m: 10 },
            } }
          );

          chai.expect(cat.matchData.perDay).to.eql({
            20190108: { matches: 2 },
            20190109: { matches: 10 },
          });
          chai.expect(cat.matchData.total.matches).to.eql(12);
        });
      });
    });
  });
