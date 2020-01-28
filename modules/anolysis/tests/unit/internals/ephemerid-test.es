/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const mocks = require('../mocks');

const moment = mocks.moment.default;

const getDateRange = (first, last) => {
  const dates = [];

  for (
    let date = first;
    date.diff(last, 'days') <= 0;
    date.add(1, 'days')
  ) {
    dates.push(date.clone());
  }

  return dates;
};

export default describeModule(
  'anolysis/internals/ephemerid',
  () => ({ ...mocks }),
  () => {
    describe('#ephemerid', () => {
      let ephemerid;

      beforeEach(function () {
        ephemerid = this.module().default;
      });


      describe('absolute ephemerid', () => {
        const kind = 'absolute';

        it('different sessions => different ephemerids', () => {
          const params = {
            installDate: moment('2018-01-01'),
            kind,
            n: 1,
            name: 'module.metric.action.target',
            today: moment('2018-02-01'),
            unit: 'day',
          };

          const ephemerid1 = ephemerid({ ...params, session: 'djsalk483de' });
          const ephemerid2 = ephemerid({ ...params, session: '43po25uuk3r' });

          chai.expect(ephemerid1).to.not.eql(ephemerid2);
        });

        it('different names => different ephemerids', () => {
          const params = {
            installDate: moment('2018-01-01'),
            kind,
            n: 1,
            session: 'djsalk483de',
            today: moment('2018-02-01'),
            unit: 'day',
          };

          const ephemerid1 = ephemerid({ ...params, name: 'module1.metric.action' });
          const ephemerid2 = ephemerid({ ...params, name: 'module2.metric.action' });

          chai.expect(ephemerid1).to.not.eql(ephemerid2);
        });

        describe('unit: day', () => {
          it('1 * day => as many ephemerids as days', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2018-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            const dayCount = dates.length;
            const ephemeridCount = new Set(ephemerids).size;

            chai.expect(dayCount).to.eql(ephemeridCount);
          });

          it('2 * day => half as many ephemerids as days', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 2,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2018-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            const dayCount = dates.length;
            const ephemeridCount = new Set(ephemerids).size;

            // a difference of max. 1 is expected (depends on alignment)
            chai.expect(ephemeridCount - dayCount / 2).to.be.within(0, 1);
          });

          it('2 * day => same ephemerid for 2 consecutive days', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 2,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            for (let i = 0; i < ephemerids.length - 2; i += 2) {
              chai.expect(ephemerids[i]).to.eql(ephemerids[i + 1]);
            }
          });

          it('n = 1..30 * day => days/n unique ephemerids', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));
            const getEphemerid = n => dates.map(
              today => ephemerid({ ...params, n, today })
            );

            const dayCount = dates.length;

            for (let n = 1; n < 31; n += 1) {
              const ephemerids = getEphemerid(n);
              const ephemeridCount = new Set(ephemerids).size;

              // we'd only get 0 if intervals were perfectly aligned
              chai.expect(ephemeridCount - dayCount / n).to.be.within(0, 2);
            }
          });

          it('n = 1..30 * day => same ephemerid for n consecutive days', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));
            const getEphemerid = n => dates.map(
              today => ephemerid({ ...params, n, today })
            );

            for (let n = 1; n < 31; n += 1) {
              const ephemerids = getEphemerid(n);

              // go through all intervals
              for (let i = 0; i < ephemerids.length - n; i += n) {
                // pairwise comparison of adjacent ephemerid within interval
                for (let j = i; j < i + n - 1; j += 1) {
                  chai.expect(ephemerids[j]).to.eql(ephemerids[j + 1]);
                }
              }
            }
          });
        });

        describe('unit: week', () => {
          it('1 * week => as many ephemerids as weeks', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'week',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            const weekCount = Math.floor(dates.length / 7);
            const ephemeridCount = new Set(ephemerids).size;

            chai.expect(weekCount).to.eql(ephemeridCount);
          });

          it('1 * week => unique ephemerid per week', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'week',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));

            // map week ID to ephemerid
            const map = new Map();
            dates.forEach((today) => {
              map.set(
                `${today.year()}-${today.isoWeek()}`,
                ephemerid({ ...params, today })
              );
            });

            // if different weeks would yield the same ephemerid
            // the number of unique keys (week IDs) would be
            // larger than the number of unique values (ephemerids)
            const weekCount = new Set(map.keys()).size;
            const ephemeridCount = new Set(map.values()).size;

            chai.expect(weekCount).to.eql(ephemeridCount);
          });

          // TODO: test n * week
        });

        describe('unit: month', () => {
          it('1 * month => as many ephemerids as months', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'month',
            };

            const dates = getDateRange(moment('2018-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            const monthCount = Math.floor(dates.length / 30);
            const ephemeridCount = new Set(ephemerids).size;

            chai.expect(monthCount).to.eql(ephemeridCount);
          });

          it('1 * month => unique ephemerid per month', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'month',
            };

            const dates = getDateRange(moment('2018-01-01'), moment('2019-12-31'));

            // map month ID to ephemerid
            const map = new Map();
            dates.forEach((today) => {
              map.set(
                `${today.year()}-${today.month()}`,
                ephemerid({ ...params, today })
              );
            });

            // if different months would yield the same ephemerid
            // the number of unique keys (month IDs) would be
            // larger than the number of unique values (ephemerids)
            const monthCount = new Set(map.keys()).size;
            const ephemeridCount = new Set(map.values()).size;

            chai.expect(monthCount).to.eql(ephemeridCount);
          });

          // TODO: test n * month
        });
      });

      describe('relative ephemerid', () => {
        const kind = 'relative';

        it('throws error for units other than day', () => {
          const params = {
            installDate: moment('2018-01-01'),
            today: moment('2019-01-01'),
            kind,
            n: 1,
            name: 'module.metric.action.target',
            session: 'djsalk483de',
          };

          chai.expect(() => ephemerid({ ...params, unit: 'day' })).to.not.throw();
          chai.expect(() => ephemerid({ ...params, unit: 'week' })).to.throw();
          chai.expect(() => ephemerid({ ...params, unit: 'month' })).to.throw();
        });


        describe('unit: day', () => {
          it('1 * day => as many ephemerids as days', () => {
            const params = {
              installDate: moment('2018-01-01'),
              kind,
              n: 1,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2019-01-01'), moment('2019-12-31'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            const dayCount = dates.length;
            const ephemeridCount = new Set(ephemerids).size;

            chai.expect(dayCount).to.eql(ephemeridCount);
          });

          it('180 * day => same ephemerid for 180 consecutive days', () => {
            // ephemerid must not change when crossing year boundary
            const n = 180;
            const params = {
              installDate: moment('2018-12-24'),
              kind,
              n,
              name: 'module.metric.action.target',
              session: 'djsalk483de',
              unit: 'day',
            };

            const dates = getDateRange(moment('2018-12-24'), moment('2019-12-23'));
            const ephemerids = dates.map(
              today => ephemerid({ ...params, today })
            );

            for (let i = 0; i < ephemerids.length - n; i += n) {
              for (let j = i; j < i + n - 1; j += 1) {
                chai.expect(ephemerids[j]).to.eql(ephemerids[j + 1]);
              }
            }
          });
        });
      });
    });
  },
);
