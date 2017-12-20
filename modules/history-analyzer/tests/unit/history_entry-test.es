/* global chai */
/* global describeModule */
/* global require */

let mockedTS = Date.now();

export default describeModule('history-analyzer/history_entry',
  () => ({
    'platform/console': {
    },
    'history-analyzer/logger': {
      default: {
        log: function(x) {console.log(x)},
        error: function(x) {console.error(x)},
      }
    },
    'core/time': {
      timestamp: function() {
        return mockedTS;
      }
    },
  }),
  () => {
    describe('#history_entry', function() {
      let HistoryEntry;
      beforeEach(function () {
        HistoryEntry = this.module().default;
      });


      function buildExpectedFromDays(dayData, e) {
          const expected = {
            match_data: {
              total: { num_days: 0, m: 0, c: 0, last_checked_url_ts: mockedTS },
              per_day: {}
            }
          };
          const eset = new Set(e);

          dayData.forEach((d) => {
            if (!eset.has(d.day)) {
              return;
            }
            expected.match_data.total.num_days += 1;
            expected.match_data.total.m += d.data.m;
            expected.match_data.total.c += d.data.c;
            expected.match_data.per_day[d.day] = { m: d.data.m, c: d.data.c, last_accessed_ts: d.data.last_ts};
          });
          return expected;
      }

      context('basic tests', function () {
        let he;
        beforeEach(function () {

          he = new HistoryEntry();
        });

        // /////////////////////////////////////////////////////////////////////
        // /////////////////////////////////////////////////////////////////////

        it('/check hasProcessedDay returns false for none existing days', function () {
          chai.expect(he.hasProcessedDay(null)).eql(false);
          chai.expect(he.hasProcessedDay(1)).eql(false);
          chai.expect(he.hasProcessedDay('20170909')).eql(false);
        });

        it('/check getProcessedDayData returns false for none existing days', function () {
          chai.expect(he.getProcessedDayData(null)).to.not.exist;
          chai.expect(he.getProcessedDayData(1)).to.not.exist;
          chai.expect(he.getProcessedDayData('20170909')).to.not.exist;
        });

        it('/setDayData works for valid values', function () {
          const d = { m: 1, c: 1 , last_ts: mockedTS};
          const d2 = { m: 2, c: 2, last_ts: mockedTS };
          const expectedD1 = { m: 1, c: 1, last_accessed_ts: mockedTS };
          const expectedD2 = { m: 2, c: 2, last_accessed_ts: mockedTS };
          chai.expect(he.hasProcessedDay('20170909')).eql(false);
          chai.expect(he.setDayData('20170909', d)).eql(true);
          chai.expect(he.hasProcessedDay('20170909')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql(expectedD1);
          chai.expect(he.setDayData('20170909', d)).eql(true);
          chai.expect(he.hasProcessedDay('20170909')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql(expectedD1);
          chai.expect(he.setDayData('20170909', d2)).eql(true);
          chai.expect(he.hasProcessedDay('20170909')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql(expectedD2);

          chai.expect(he.hasProcessedDay('20170910')).eql(false);
          chai.expect(he.setDayData('20170910', d2)).eql(true);
          chai.expect(he.hasProcessedDay('20170910')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql(expectedD2);
        });

        it('/setDayData works for invalid', function () {
          chai.expect(he.setDayData('20170909', { m:1 })).eql(false);
          chai.expect(he.hasProcessedDay('20170909')).eql(false);
          chai.expect(he.setDayData('20170909', { m:1, c1:1 })).eql(false);
          chai.expect(he.hasProcessedDay('20170909')).eql(false);
          chai.expect(he.setDayData('20170909', { c:1 })).eql(false);
          chai.expect(he.hasProcessedDay('20170909')).eql(false);
        });

        it('/setDayData updates properly', function () {
          chai.expect(he.setDayData('20170909', { m:1, c: 1, last_ts: mockedTS })).eql(true);
          chai.expect(he.hasProcessedDay('20170909')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql({ m: 1, c: 1, last_accessed_ts: mockedTS });
          mockedTS = mockedTS + 1;
          chai.expect(he.setDayData('20170909', { m:2, c: 2, last_ts: mockedTS })).eql(true);
          chai.expect(he.hasProcessedDay('20170909')).eql(true);
          chai.expect(he.getProcessedDayData('20170909')).eql({ m: 2, c: 2, last_accessed_ts: mockedTS });
        });

        it('/getDataForDays works 1', function () {
          const dayData = [
            { day: '20170909', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170910', data: { m: 0, c: 2, last_ts: mockedTS } },
            { day: '20170911', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170912', data: { m: 1, c: 1, last_ts: mockedTS } },
          ];
          dayData.forEach((d) => {
            chai.expect(he.setDayData(d.day, d.data)).eql(true);
          });

          const daysToQuery = ['20170909'];
          const fliterData = he.getDataForDays(daysToQuery);
          const expected = buildExpectedFromDays(dayData, daysToQuery);
          chai.expect(fliterData).to.eql(expected);
        });

        it('/getDataForDays works 2', function () {
          const dayData = [
            { day: '20170909', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170910', data: { m: 0, c: 2, last_ts: mockedTS } },
            { day: '20170911', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170912', data: { m: 1, c: 1, last_ts: mockedTS } },
          ];
          dayData.forEach((d) => {
            chai.expect(he.setDayData(d.day, d.data)).eql(true);
          });

          const daysToQuery = ['XXXX'];
          const fliterData = he.getDataForDays(daysToQuery);
          const expected = buildExpectedFromDays(dayData, daysToQuery);
          chai.expect(fliterData).to.eql(expected);
        });

        it('/getDataForDays works 3', function () {
          const dayData = [
            { day: '20170909', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170910', data: { m: 0, c: 2, last_ts: mockedTS } },
            { day: '20170911', data: { m: 1, c: 1, last_ts: mockedTS } },
            { day: '20170912', data: { m: 1, c: 1, last_ts: mockedTS } },
          ];
          dayData.forEach((d) => {
            chai.expect(he.setDayData(d.day, d.data)).eql(true);
          });

          const daysToQuery = ['20170909', '20170911'];
          const fliterData = he.getDataForDays(daysToQuery);
          const expected = buildExpectedFromDays(dayData, daysToQuery);
          chai.expect(fliterData).to.eql(expected);
        });


      }); // end of context
    }); // end of describe module
  }
);
