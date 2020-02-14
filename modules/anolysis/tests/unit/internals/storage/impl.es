/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-await-in-loop */
/* globals chai, sinon */

export default function sortBy(signals, by = v => v) {
  return signals.sort((s1, s2) => {
    if (by(s1) === undefined || by(s1) < by(s2)) {
      return -1;
    }
    if (by(s2) === undefined || by(s1) > by(s2)) {
      return 1;
    }
    return 0;
  });
}

module.exports = ({
  getCurrentDate,
  setCurrentDate,
  getStorage,
  forceReloadDuringTests,
}) => {
  let SafeDate = null;
  let storage;

  const makeSignal = signal => ({
    meta: {
      date: getCurrentDate().toString(),
    },
    ...signal,
  });

  // This is used to reload storage in the middle of some tests, to simulate
  // real conditions where storage would be unloaded then re-opened later.
  const reloadStorage = async () => {
    if (storage === undefined) {
      storage = getStorage();
    } else if (forceReloadDuringTests === true) {
      storage.unload();
    }

    await storage.init();
  };

  beforeEach(async function () {
    if (SafeDate === null) {
      SafeDate = (await this.system.import('anolysis/internals/date')).default;
    }

    return reloadStorage();
  });

  afterEach(async () => {
    await storage.destroy();
    storage = undefined;
  });

  describe('aggregated', () => {
    describe('#runTaskAtMostOnce', () => {
      it('calls the function if the date is not already stored', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2017-01-01'),
          'foo',
          fn,
        );

        chai.expect(called).to.be.true;
      });

      it('does not call the function if the date is already stored', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2017-01-01'),
          'foo',
          () => {},
        );

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2017-01-01'),
          'foo',
          fn,
        );

        chai.expect(called).to.be.false;
      });

      it('calls the function if the date is already stored for another metric', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2017-01-01'),
          'foo',
          () => {},
        );

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2017-01-01'),
          'bar',
          fn,
        );

        chai.expect(called).to.be.true;
      });

      it('calls the function at most once per week', async () => {
        const fn = sinon.spy();

        // January 2020
        // Mo Tu We Th Fr Sa Su
        // 6  7  8  9  10 11 12
        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2020-01-06'),
          'foo',
          fn,
          'week',
        );
        chai.expect(fn).to.have.been.calledOnce;

        // When called for other dates of the same week, does not increment count.
        for (const date of [
          '2020-01-07',
          '2020-01-08',
          '2020-01-09',
          '2020-01-10',
          '2020-01-11',
          '2020-01-12',
        ]) {
          await storage.aggregated.runTaskAtMostOnce(
            SafeDate.fromBackend(date),
            'foo',
            fn,
            'week',
          );
          await reloadStorage();
          chai.expect(fn).to.have.been.calledOnce;
        }

        // Call `fn` again on next week.
        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2020-01-13'),
          'foo',
          fn,
          'week',
        );
        chai.expect(fn).to.have.been.calledTwice;
      });


      it('calls the function at most once per month', async () => {
        const fn = sinon.spy();

        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2020-01-01'),
          'foo',
          fn,
          'month',
        );
        chai.expect(fn).to.have.been.calledOnce;

        // When called for other dates of the same month, does not increment count.
        for (const date of [
          '2020-01-07',
          '2020-01-14',
          '2020-01-30',
          '2020-01-31',
        ]) {
          await storage.aggregated.runTaskAtMostOnce(
            SafeDate.fromBackend(date),
            'foo',
            fn,
            'month',
          );
          await reloadStorage();
          chai.expect(fn).to.have.been.calledOnce;
        }

        // Call `fn` again on next month.
        await storage.aggregated.runTaskAtMostOnce(
          SafeDate.fromBackend('2020-02-01'),
          'foo',
          fn,
          'month',
        );
        chai.expect(fn).to.have.been.calledTwice;
      });
    });

    describe('#getAggregatedDates', () => {
      it('returns empty list when no date has been aggregated', async () =>
        chai.expect(await storage.aggregated.getAggregatedDates()).to.be.empty);

      it('return aggregated dates', async () => {
        await Promise.all([
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-01'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-01'), 'baz', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-02'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-03'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-03'), 'bar', () => {}),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai
          .expect(sortBy(await storage.aggregated.getAggregatedDates()))
          .to.be.eql(sortBy(['2017-01-01', '2017-01-02', '2017-01-03']));
      });
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () =>
        storage.aggregated.deleteOlderThan(SafeDate.fromBackend('2017-01-01')));

      it('deletes entries older entries', async () => {
        await Promise.all([
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-01'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-01'), 'bar', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-02'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-03'), 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce(SafeDate.fromBackend('2017-01-01'), 'baz', () => {}),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.deleteOlderThan(
          SafeDate.fromBackend('2017-01-02'),
        );

        // Force reload to check `init()`
        await reloadStorage();

        chai
          .expect(sortBy(await storage.aggregated.getAggregatedDates()))
          .to.be.eql(sortBy(['2017-01-02', '2017-01-03']));
      });
    });
  });

  describe('signal', () => {
    describe('#push', () => {
      it('resolves when adding signal', () =>
        storage.signals.push(makeSignal({ s: 1 })));

      it('allows identical signals to be pushed', async () => {
        await Promise.all([
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 1 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai
          .expect(sortBy(await storage.signals.getAll(), ({ id }) => id))
          .to.be.eql(
            sortBy(
              [
                {
                  signal: makeSignal({ s: 1 }),
                  attempts: 0,
                  date: '2017-01-01',
                  id: 1,
                },
                {
                  signal: makeSignal({ s: 1 }),
                  attempts: 0,
                  date: '2017-01-01',
                  id: 2,
                },
                {
                  signal: makeSignal({ s: 1 }),
                  attempts: 0,
                  date: '2017-01-01',
                  id: 3,
                },
              ],
              ({ id }) => id,
            ),
          );
      });
    });

    describe('#remove', () => {
      it('does not fail if id did not exist', () => storage.signals.remove(42));

      it('does not fail if id is undefined', () =>
        storage.signals.remove(undefined));

      it('does not fail if id is null', () => storage.signals.remove(null));

      it('deletes if id is valid', async () => {
        await storage.signals.push(makeSignal({ s: 1 }));

        // Force reload to check `init()`
        await reloadStorage();

        await storage.signals.remove(1);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.be.empty;
      });
    });

    describe('#getAll', () => {
      it('returns empty list if there is no signals', async () =>
        chai.expect(await storage.signals.getAll()).to.be.empty);

      it('returns all available signals', async () => {
        await Promise.all([
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 2 })),
          storage.signals.push(makeSignal({ s: 1 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.have.length(3);
      });
    });

    describe('#getN', () => {
      it('returns empty list if there is no signals', async () =>
        chai.expect(await storage.signals.getN(1)).to.be.empty);

      it('returns all available signals if N is bigger than queue size', async () => {
        await Promise.all([
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 2 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(2);
        chai.expect(await storage.signals.getN(3)).to.have.length(2);
      });

      it('returns N signals if >N are available', async () => {
        await Promise.all([
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 2 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(2);
        chai.expect(await storage.signals.getN(1)).to.have.length(1);
      });
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () =>
        storage.signals.deleteOlderThan(SafeDate.fromBackend('2017-01-01')));

      it('deletes a single entry', async () => {
        await storage.signals.push(makeSignal({}));

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(1);
        await storage.signals.deleteOlderThan(
          SafeDate.fromBackend('2018-01-01'),
        );

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(0);
        chai.expect(await storage.signals.getAll()).to.be.empty;
      });

      it('deletes multiple entries', async () => {
        await Promise.all([
          storage.signals.push(makeSignal({ s: 1 })),
          storage.signals.push(makeSignal({ s: 2 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.signals.deleteOlderThan(
          SafeDate.fromBackend('2018-01-01'),
        );

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.be.empty;
      });
    });

    it('robust to batch operations', async () => {
      await Promise.all([
        storage.signals.push(makeSignal({})),
        storage.signals.push(makeSignal({})),
        storage.signals.push(makeSignal({})),
        storage.signals.push(makeSignal({})),
      ]);

      // Force reload to check `init()`
      await reloadStorage();

      chai.expect(await storage.signals.getSize()).to.be.eql(4);
      chai
        .expect(sortBy(await storage.signals.getAll(), ({ id }) => id))
        .to.eql(
          sortBy(
            [
              {
                id: 1,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 2,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 3,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 4,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
            ],
            ({ id }) => id,
          ),
        );

      await Promise.all([
        storage.signals.push(makeSignal({})),
        storage.signals.remove(1),
        storage.signals.push(makeSignal({})),
        storage.signals.remove(2),
        storage.signals.remove(3),
      ]);

      // Force reload to check `init()`
      await reloadStorage();

      chai.expect(await storage.signals.getSize()).to.be.eql(3);

      chai
        .expect(sortBy(await storage.signals.getAll(), ({ id }) => id))
        .to.eql(
          sortBy(
            [
              {
                id: 4,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 5,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 6,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
            ],
            ({ id }) => id,
          ),
        );

      chai
        .expect(sortBy(await storage.signals.getN(3), ({ id }) => id))
        .to.eql(
          sortBy(
            [
              {
                id: 4,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 5,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
              {
                id: 6,
                signal: makeSignal({}),
                attempts: 0,
                date: '2017-01-01',
              },
            ],
            ({ id }) => id,
          ),
        );
    });
  });

  describe('behavior', () => {
    describe('#add', () => {
      /* Already tested by sub-sequent tests */
    });

    describe('#getTypesForDate', () => {
      it('should return records given complete timespan with records', async () => {
        const date = getCurrentDate();
        await storage.behavior.add(date, 'type_A', { value: 0 });
        await storage.behavior.add(date, 'type_B', { value: 1 });

        await new Promise(resolve => setTimeout(resolve, 1));

        await Promise.all([
          storage.behavior.add(date, 'type_A', { value: 5 }),
          storage.behavior.add(date, 'type_B', { value: 6 }),
          storage.behavior.add(date, 'type_A', { value: 7 }),
          storage.behavior.add(date, 'type_A', { value: 5 }),
          storage.behavior.add(date, 'type_B', { value: 6 }),
          storage.behavior.add(date, 'type_B', { value: 6 }),
          storage.behavior.add(date, 'type_A', { value: 5 }),
          storage.behavior.add(date, 'type_A', { value: 5 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getCurrentDate());
        const records = types.toObj();

        chai.expect(records).to.contain.all.keys(['type_A', 'type_B']);
        chai.expect(records.type_A.length).to.equal(6);
        chai.expect(records.type_B.length).to.equal(4);
        chai.expect(records.type_A[0].value).to.equal(0);
        chai.expect(records.type_B[0].value).to.equal(1);
      });

      it('should return records ordered by timestamp', async () => {
        const date = getCurrentDate();
        await storage.behavior.add(date, 'type_A', { value: 1 });
        await storage.behavior.add(date, 'type_A', { value: 2 });
        await storage.behavior.add(date, 'type_A', { value: 3 });
        await storage.behavior.add(date, 'type_A', { value: 4 });
        await storage.behavior.add(date, 'type_A', { value: 5 });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(
          getCurrentDate(),
        );
        chai
          .expect(sortBy(records.toObj().type_A, ({ value }) => value))
          .to.be.eql(
            sortBy(
              [
                { value: 1 },
                { value: 2 },
                { value: 3 },
                { value: 4 },
                { value: 5 },
              ],
              ({ value }) => value,
            ),
          );
      });

      it('should return records given from timestamp with records', async () => {
        await storage.behavior.add(getCurrentDate(), 'type_A', { value: 5 });

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getCurrentDate());
        const records = types.toObj();
        chai.expect(records).to.contain.all.keys(['type_A']);
        chai.expect(records.type_A.length).to.equal(1);
        chai.expect(records.type_A[0].value).to.equal(5);
      });

      it('should return records given from timestamp with records', async () => {
        await storage.behavior.add(getCurrentDate(), 'type_A', { value: 5 });

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getCurrentDate());
        const records = types.toObj();
        chai.expect(records).to.contain.all.keys(['type_A']);
        chai.expect(records.type_A.length).to.equal(1);
        chai.expect(records.type_A[0].value).to.equal(5);
      });

      it('should return empty object given complete timespan without records', async () => {
        const previousDay = getCurrentDate().subDays(1);

        await storage.behavior.add(getCurrentDate(), 'type_A', { value: 5 });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(previousDay);
        chai.expect(records.size).to.eql(0);
      });

      it('should return empty object given from timespan without records', async () => {
        const nextDay = getCurrentDate().subDays(1);

        await storage.behavior.add(getCurrentDate(), 'type_A', { value: 5 });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(nextDay);
        chai.expect(records.size).to.eql(0);
      });
    });

    describe('#deleteByDate', () => {
      it('should delete all records', async () => {
        const addAtDate = (date, type, behavior) => {
          setCurrentDate(date);
          return storage.behavior.add(getCurrentDate(), type, behavior);
        };

        const date = '2017-01-01';

        await Promise.all([
          addAtDate(date, 'type_A', { value: 5 }),
          addAtDate(date, 'type_B', { value: 6 }),
          addAtDate(date, 'type_A', { value: 7 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.behavior.deleteByDate(SafeDate.fromBackend(date));

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(
          SafeDate.fromBackend(date),
        );
        chai.expect(records.size).to.eql(0);
      });

      it('should delete some records', async () => {
        const addAtDate = (date, type, behavior) => {
          setCurrentDate(date);
          return storage.behavior.add(getCurrentDate(), type, behavior);
        };

        await Promise.all([
          addAtDate('2017-01-01', 'type_A', { value: 5 }),
          addAtDate('2017-01-02', 'type_B', { value: 6 }),
          addAtDate('2017-01-02', 'type_A', { value: 7 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.behavior.deleteByDate(SafeDate.fromBackend('2017-01-02'));

        // Force reload to check `init()`
        await reloadStorage();

        chai
          .expect(
            (await storage.behavior.getTypesForDate(
              SafeDate.fromBackend('2017-01-02'),
            )).size,
          )
          .to.eql(0);
        chai
          .expect(
            (await storage.behavior.getTypesForDate(
              SafeDate.fromBackend('2017-01-01'),
            )).size,
          )
          .to.eql(1);
      });
    });
  });
};
