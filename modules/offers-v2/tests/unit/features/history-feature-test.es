/* global chai */
/* global describeModule */
/* global sinon */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/features/history-feature',
  () => ({
    ...commonMocks,
    'core/url': {},
  }),
  () => {
    describe('/History feature', function () {
      const historyMock = sinon.stub();
      let hfeature;
      let buildSimplePatternIndex;

      beforeEach(async function () {
        const HistoryFeature = this.module().default;
        buildSimplePatternIndex = (await this.system.import('offers-v2/common/pattern-utils')).buildSimplePatternIndex;
        historyMock.reset();
        historyMock.returns([]);
        hfeature = new HistoryFeature({ queryVisitsForTimespan: historyMock });
      });

      function boilerplateResult(total, perDay) {
        return {
          pid: 'somePid',
          d: {
            match_data: {
              total,
              per_day: perDay,
            },
          }
        };
      }

      function boilerplateQuery(urls) {
        return {
          pid: 'somePid',
          index: buildSimplePatternIndex(urls),
          start_ms: Date.parse('2018-02-02T12:00:00'),
          end_ms: Date.parse('2019-02-02T12:00:00'),
        };
      }

      function boilerplateTotal(numDays, count, lastUrlMs) {
        return {
          num_days: numDays,
          m: count,
          last_checked_url_ts: lastUrlMs || (Date.parse('2019-02-02T12:00:00') + 1),
        };
      }

      it('/find nothing if there is nothing', async () => {
        historyMock.returns([]);

        const query = boilerplateQuery(['google.de']);
        const result = await hfeature.performQueryOnHistory(query);

        const expected = boilerplateResult(boilerplateTotal(0, 0), {});
        chai.expect(result).to.eql(expected);
      });

      it('/find one match', async () => {
        historyMock.returns([{
          ts: Date.parse('2019-01-01T12:00:00'),
          url: 'http://www.google.de/'
        }]);

        const query = boilerplateQuery(['google.de']);
        const result = await hfeature.performQueryOnHistory(query);

        const expected = boilerplateResult(
          boilerplateTotal(1, 1),
          { 20190101: { m: 1 } }
        );
        chai.expect(result).to.eql(expected);
      });

      it('/find several matches for one bucket', async () => {
        const visit1 = Date.parse('2019-01-01T12:00:00');
        const visit2 = Date.parse('2019-01-01T13:00:00');
        const visit3 = Date.parse('2019-01-01T14:00:00');
        historyMock.returns([
          { ts: visit1, url: 'http://www.google.de/' },
          { ts: visit2, url: 'http://www.google.de/' },
          { ts: visit3, url: 'http://www.google.de/' },
        ]);

        const query = boilerplateQuery(['google.de']);
        const result = await hfeature.performQueryOnHistory(query);

        const expected = boilerplateResult(
          boilerplateTotal(1, 3),
          { 20190101: { m: 3 } }
        );
        chai.expect(result).to.eql(expected);
      });

      it('/find several matches for several buckets', async () => {
        const day1visit1 = Date.parse('2018-01-06T12:00:00');
        const day2visit1 = Date.parse('2018-01-08T13:00:00');
        const day2visit2 = Date.parse('2018-01-08T14:00:00');
        const day3visit1 = Date.parse('2018-01-10T12:00:00');
        historyMock.returns([
          { ts: day1visit1, url: 'http://www.google.de/' },
          { ts: day2visit1, url: 'http://www.google.de/' },
          { ts: day2visit2, url: 'http://www.google.de/' },
          { ts: day3visit1, url: 'http://www.google.de/' },
        ]);

        const query = boilerplateQuery(['google.de']);
        const result = await hfeature.performQueryOnHistory(query);

        const expected = boilerplateResult(
          boilerplateTotal(3, 4),
          {
            20180106: { m: 1 },
            20180108: { m: 2 },
            20180110: { m: 1 },
          }
        );
        chai.expect(result).to.eql(expected);
      });

      it('/use time range for querying the history', async () => {
        const query = boilerplateQuery(['google.de']);
        query.start_ms = 777;
        query.end_ms = 888;

        await hfeature.performQueryOnHistory(query);

        const [{ frameStartsAt, frameEndsAt }] = historyMock.firstCall.args;
        chai.expect(frameStartsAt).is.eq(777 - 1);
        chai.expect(frameEndsAt).is.eq(888 + 1);
      });

      it('/do not query if no patterns', async () => {
        const query = boilerplateQuery([]);

        await hfeature.performQueryOnHistory(query);

        chai.expect(historyMock).to.be.not.called;
      });
    });
  });
