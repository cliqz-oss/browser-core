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

function iterDates(cb) {
  for (const year of [2000, 2019, 2100]) {
    for (const month of ['01', '06', '12']) {
      for (const day of ['01', '15', '30']) {
        cb(year, month, day);
      }
    }
  }
}

export default describeModule(
  'anolysis/internals/date',
  () => mocks,
  () => {
    describe('#SafeDate', () => {
      let SafeDate;

      beforeEach(function () {
        SafeDate = this.module().default;
      });

      describe('#fromConfig', () => {
        iterDates((year, month, day) => {
          const config = `${year}${month}${day}`;
          const backend = `${year}-${month}-${day}`;
          it(`parses ${config} into ${backend}`, () => {
            chai.expect(SafeDate.fromConfig(config).toString()).to.eql(backend);
          });
        });

        describe('reject wrong input', () => {
          [undefined, null, Date.now(), '', '2019-10-10', '2019101'].forEach((input) => {
            it(`${input}`, () => {
              chai.expect(() => SafeDate.fromConfig(input)).to.throw;
            });
          });
        });
      });

      describe('#fromBackend', () => {
        iterDates((year, month, day) => {
          const backend = `${year}-${month}-${day}`;
          it(`parses ${backend}`, () => {
            chai.expect(SafeDate.fromBackend(backend).toString()).to.eql(backend);
          });
        });

        describe('reject wrong input', () => {
          [undefined, null, Date.now(), '', '20191010', '2019-1-1'].forEach((input) => {
            it(`${input}`, () => {
              chai.expect(() => SafeDate.fromConfig(input)).to.throw;
            });
          });
        });
      });

      it('#subDays', () => {
        const start = SafeDate.fromBackend('2000-01-02');
        chai.expect(start.subDays(0)).to.eql(start);

        chai.expect(start.subDays(1).toString()).to.eql('2000-01-01');
        chai.expect(start.subDays(2).toString()).to.eql('1999-12-31');
        chai.expect(start.subDays(3).toString()).to.eql('1999-12-30');
      });

      it('#isSameDay', () => {
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameDay(SafeDate.fromBackend('2000-01-01')),
        ).to.be.false;
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameDay(SafeDate.fromBackend('2000-01-02')),
        ).to.be.true;
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameDay(SafeDate.fromBackend('2000-01-03')),
        ).to.be.false;
      });

      it('#isSameOrBeforeDay', () => {
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameOrBeforeDay(SafeDate.fromBackend('2000-01-01')),
        ).to.be.false;
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameOrBeforeDay(SafeDate.fromBackend('2000-01-02')),
        ).to.be.true;
        chai.expect(
          SafeDate.fromBackend('2000-01-02').isSameOrBeforeDay(SafeDate.fromBackend('2000-01-03')),
        ).to.be.true;
      });
    });
  },
);
