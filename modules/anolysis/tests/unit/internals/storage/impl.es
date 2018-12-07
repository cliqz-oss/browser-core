/* global chai */

export default function sortBy(signals, by = (v => v)) {
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
  DATE_FORMAT,
  getCurrentMoment,
  getFormattedCurrentDate,
  setCurrentDate,
  getStorage,
  forceReloadDuringTests,
}) => {
  let Storage;
  let storage;

  // This is used to reload storage in the middle of some tests, to simulate
  // real conditions where storage would be unloaded then re-opened later.
  const reloadStorage = async () => {
    if (storage === undefined) {
      storage = new Storage();
    } else if (forceReloadDuringTests === true) {
      storage.unload();
    }

    await storage.init();
  };

  beforeEach(function () {
    Storage = getStorage();
    return reloadStorage();
  });

  afterEach(async () => {
    await storage.destroy();
    storage = undefined;
  });

  describe('retention', () => {
    it('default to empty state the first time', async () => (
      chai.expect(await storage.retention.getState()).to.eql({
        daily: {},
        weekly: {},
        monthly: {},
      })
    ));

    it('it gets back the state set previously', async () => {
      // Insert initial value
      await storage.retention.setState({ foo: 'bar' });

      // Force reload to check `init()`
      await reloadStorage();

      chai.expect(await storage.retention.getState()).to.eql({
        foo: 'bar',
      });

      // Change value
      await storage.retention.setState({ foo: 'baz' });
      chai.expect(await storage.retention.getState()).to.eql({
        foo: 'baz',
      });
    });
  });

  describe('aggregated', () => {
    describe('#runTaskAtMostOnce', () => {
      it('calls the function if the date is not already stored', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', fn);
        chai.expect(called).to.be.true;
      });

      it('does not call the function if the date is already stored', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {});

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', fn);
        chai.expect(called).to.be.false;
      });

      it('calls the function if the date is already stored for another metric', async () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        await storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {});

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.runTaskAtMostOnce('2017-01-01', 'bar', fn);
        chai.expect(called).to.be.true;
      });
    });

    describe('#getAggregatedDates', () => {
      it('returns empty list when no date has been aggregated', async () => (
        chai.expect(await storage.aggregated.getAggregatedDates()).to.be.empty
      ));

      it('return aggregated dates', async () => {
        await Promise.all([
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'baz', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-02', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-03', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-03', 'bar', () => {}),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(sortBy(await storage.aggregated.getAggregatedDates())).to.be.eql(sortBy([
          '2017-01-01', '2017-01-02', '2017-01-03',
        ]));
      });
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () => (
        storage.aggregated.deleteOlderThan('2017-01-01')
      ));

      it('deletes entries older entries', async () => {
        await Promise.all([
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'bar', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-02', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-03', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'baz', () => {}),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.aggregated.deleteOlderThan('2017-01-02');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(sortBy(await storage.aggregated.getAggregatedDates())).to.be.eql(sortBy([
          '2017-01-02', '2017-01-03'
        ]));
      });
    });
  });

  describe('signal', () => {
    describe('#push', () => {
      it('resolves when adding signal', () => storage.signals.push({ s: 1 }));

      it('allows identical signals to be pushed', async () => {
        await Promise.all([
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 1 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(sortBy(await storage.signals.getAll(), ({ id }) => id)).to.be.eql(sortBy([
          { signal: { s: 1 }, attempts: 0, date: '2017-01-01', id: 1 },
          { signal: { s: 1 }, attempts: 0, date: '2017-01-01', id: 2 },
          { signal: { s: 1 }, attempts: 0, date: '2017-01-01', id: 3 },
        ], ({ id }) => id));
      });
    });

    describe('#remove', () => {
      it('does not fail if id did not exist', () => storage.signals.remove(42));

      it('does not fail if id is undefined', () => storage.signals.remove(undefined));

      it('does not fail if id is null', () => storage.signals.remove(null));

      it('deletes if id is valid', async () => {
        await storage.signals.push({ s: 1 });

        // Force reload to check `init()`
        await reloadStorage();

        await storage.signals.remove(1);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.be.empty;
      });
    });

    describe('#getAll', () => {
      it('returns empty list if there is no signals', async () => (
        chai.expect(await storage.signals.getAll()).to.be.empty
      ));

      it('returns all available signals', async () => {
        await Promise.all([
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 2 }),
          storage.signals.push({ s: 1 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.have.length(3);
      });
    });

    describe('#getN', () => {
      it('returns empty list if there is no signals', async () => (
        chai.expect(await storage.signals.getN(1)).to.be.empty
      ));

      it('returns all available signals if N is bigger than queue size', async () => {
        await Promise.all([
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 2 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(2);
        chai.expect(await storage.signals.getN(3)).to.have.length(2);
      });

      it('returns N signals if >N are available', async () => {
        await Promise.all([
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 2 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(2);
        chai.expect(await storage.signals.getN(1)).to.have.length(1);
      });
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () => (
        storage.signals.deleteOlderThan('2017-01-01')
      ));

      it('deletes a single entry', async () => {
        await storage.signals.push({});

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(1);
        await storage.signals.deleteOlderThan('2018-01-01');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getSize()).to.be.eql(0);
        chai.expect(await storage.signals.getAll()).to.be.empty;
      });

      it('deletes multiple entries', async () => {
        await Promise.all([
          storage.signals.push({ s: 1 }),
          storage.signals.push({ s: 2 }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.signals.deleteOlderThan('2018-01-01');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(await storage.signals.getAll()).to.be.empty;
      });
    });

    it('robust to batch operations', async () => {
      await Promise.all([
        storage.signals.push({}),
        storage.signals.push({}),
        storage.signals.push({}),
        storage.signals.push({}),
      ]);

      // Force reload to check `init()`
      await reloadStorage();

      chai.expect(await storage.signals.getSize()).to.be.eql(4);
      chai.expect(sortBy(await storage.signals.getAll(), ({ id }) => id)).to.eql(sortBy([
        { id: 1, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 2, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 3, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
      ], ({ id }) => id));

      await Promise.all([
        storage.signals.push({}),
        storage.signals.remove(1),
        storage.signals.push({}),
        storage.signals.remove(2),
        storage.signals.remove(3),
      ]);

      // Force reload to check `init()`
      await reloadStorage();

      chai.expect(await storage.signals.getSize()).to.be.eql(3);

      chai.expect(sortBy(await storage.signals.getAll(), ({ id }) => id)).to.eql(sortBy([
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 5, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 6, signal: {}, attempts: 0, date: '2017-01-01' },
      ], ({ id }) => id));

      chai.expect(sortBy(await storage.signals.getN(3), ({ id }) => id)).to.eql(sortBy([
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 5, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 6, signal: {}, attempts: 0, date: '2017-01-01' },
      ], ({ id }) => id));
    });
  });

  describe('gid', () => {
    describe('get/set', () => {
      it('returns undefined if key does not exist', () => {
        chai.expect(storage.gid.get('foo')).to.be.undefined;
      });

      it('returns set value', async () => {
        await storage.gid.set('foo', 'bar');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(storage.gid.get('foo')).to.be.eql('bar');
      });

      it('overrides existing value', async () => {
        await storage.gid.set('foo', 'bar');
        await storage.gid.set('foo', 'baz');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(storage.gid.get('foo')).to.be.eql('baz');
      });
    });

    describe('#entries', () => {
      it('returns all entries', async () => {
        await Promise.all([
          storage.gid.set('foo', JSON.stringify({ value: 1 })),
          storage.gid.set('bar', JSON.stringify({ value: 2 })),
          storage.gid.set('baz', JSON.stringify({ value: 3 })),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect(sortBy(storage.gid.entries(), ({ key }) => key)).to.be.eql(sortBy([
          { key: 'foo', value: JSON.stringify({ value: 1 }) },
          { key: 'bar', value: JSON.stringify({ value: 2 }) },
          { key: 'baz', value: JSON.stringify({ value: 3 }) },
        ], ({ key }) => key));
      });
    });
  });

  describe('behavior', () => {
    describe('#add', () => {
      /* Already tested by sub-sequent tests */
    });

    describe('#getTypesForDate', () => {
      it('should return records given complete timespan with records', async () => {
        await storage.behavior.add({ type: 'type_A', behavior: { value: 0 } });
        await storage.behavior.add({ type: 'type_B', behavior: { value: 1 } });

        await new Promise(resolve => setTimeout(resolve, 1));

        await Promise.all([
          storage.behavior.add({ type: 'type_A', behavior: { value: 5 } }),
          storage.behavior.add({ type: 'type_B', behavior: { value: 6 } }),
          storage.behavior.add({ type: 'type_A', behavior: { value: 7 } }),
          storage.behavior.add({ type: 'type_A', behavior: { value: 5 } }),
          storage.behavior.add({ type: 'type_B', behavior: { value: 6 } }),
          storage.behavior.add({ type: 'type_B', behavior: { value: 6 } }),
          storage.behavior.add({ type: 'type_A', behavior: { value: 5 } }),
          storage.behavior.add({ type: 'type_A', behavior: { value: 5 } }),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getFormattedCurrentDate());
        const records = types.toObj();

        chai.expect(records).to.contain.all.keys(['type_A', 'type_B']);
        chai.expect(records.type_A.length).to.equal(6);
        chai.expect(records.type_B.length).to.equal(4);
        chai.expect(records.type_A[0].value).to.equal(0);
        chai.expect(records.type_B[0].value).to.equal(1);
      });

      it('should return records ordered by timestamp', async () => {
        await storage.behavior.add({ type: 'type_A', behavior: { value: 1 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 2 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 3 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 4 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(getFormattedCurrentDate());
        chai.expect(sortBy(records.toObj().type_A, ({ value }) => value)).to.be.eql(sortBy([
          { value: 1 },
          { value: 2 },
          { value: 3 },
          { value: 4 },
          { value: 5 },
        ], ({ value }) => value));
      });

      it('should return records given from timestamp with records', async () => {
        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getFormattedCurrentDate());
        const records = types.toObj();
        chai.expect(records).to.contain.all.keys(['type_A']);
        chai.expect(records.type_A.length).to.equal(1);
        chai.expect(records.type_A[0].value).to.equal(5);
      });

      it('should return records given from timestamp with records', async () => {
        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });

        // Force reload to check `init()`
        await reloadStorage();

        const types = await storage.behavior.getTypesForDate(getFormattedCurrentDate());
        const records = types.toObj();
        chai.expect(records).to.contain.all.keys(['type_A']);
        chai.expect(records.type_A.length).to.equal(1);
        chai.expect(records.type_A[0].value).to.equal(5);
      });

      it('should return empty object given complete timespan without records', async () => {
        const previousDay = getCurrentMoment()
          .subtract(1, 'days')
          .format(DATE_FORMAT);

        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(previousDay);
        chai.expect(records.size).to.eql(0);
      });

      it('should return empty object given from timespan without records', async () => {
        const nextDay = getCurrentMoment()
          .add(1, 'days')
          .format(DATE_FORMAT);

        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(nextDay);
        chai.expect(records.size).to.eql(0);
      });
    });

    describe('#deleteByDate', () => {
      it('should delete all records', async () => {
        const addAtDate = (doc, date) => {
          setCurrentDate(date);
          return storage.behavior.add(doc);
        };

        const date = '2017-01-01';

        await Promise.all([
          addAtDate({ type: 'type_A', behavior: { value: 5 } }, date),
          addAtDate({ type: 'type_B', behavior: { value: 6 } }, date),
          addAtDate({ type: 'type_A', behavior: { value: 7 } }, date),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.behavior.deleteByDate(date);

        // Force reload to check `init()`
        await reloadStorage();

        const records = await storage.behavior.getTypesForDate(date);
        chai.expect(records.size).to.eql(0);
      });

      it('should delete some records', async () => {
        const addAtDate = (doc, date) => {
          setCurrentDate(date);
          return storage.behavior.add(doc);
        };

        await Promise.all([
          addAtDate({ type: 'type_A', behavior: { value: 5 } }, '2017-01-01'),
          addAtDate({ type: 'type_B', behavior: { value: 6 } }, '2017-01-02'),
          addAtDate({ type: 'type_A', behavior: { value: 7 } }, '2017-01-02'),
        ]);

        // Force reload to check `init()`
        await reloadStorage();

        await storage.behavior.deleteByDate('2017-01-02');

        // Force reload to check `init()`
        await reloadStorage();

        chai.expect((await storage.behavior.getTypesForDate('2017-01-02')).size).to.eql(0);
        chai.expect((await storage.behavior.getTypesForDate('2017-01-01')).size).to.eql(1);
      });
    });
  });
};
