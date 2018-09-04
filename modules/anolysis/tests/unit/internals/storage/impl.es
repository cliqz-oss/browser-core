/* global chai */

module.exports = function ({
  DATE_FORMAT,
  getCurrentMoment,
  getFormattedCurrentDate,
  setCurrentDate,
  getStorage,
}) {
  let storage;

  beforeEach(function () {
    const Storage = getStorage();
    storage = new Storage();
    return storage.init();
  });

  afterEach(() => storage.destroy());

  describe('retention', () => {
    it('default to empty state the first time', () =>
      storage.retention.getState()
        .then(state => chai.expect(state).to.eql({
          daily: {},
          weekly: {},
          monthly: {},
        }))
    );

    it('it gets back the state set previously', () =>
      storage.retention.setState({ foo: 'bar' })
        .then(() => storage.retention.getState())
        .then(state => chai.expect(state).to.eql({
          foo: 'bar',
        }))
    );
  });

  describe('aggregated', () => {
    describe('#runTaskAtMostOnce', () => {
      it('calls the function if the date is not already stored', () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        return storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', fn)
          .then(() => chai.expect(called).to.be.true);
      });

      it('does not call the function if the date is already stored', () => {
        let called = false;
        const fn = () => {
          called = true;
        };

        return storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {})
          .then(() => storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', fn))
          .then(() => chai.expect(called).to.be.false);
      });
    });

    describe('#getAggregatedDates', () => {
      it('returns empty list when no date has been aggregated', () =>
        storage.aggregated.getAggregatedDates()
          .then(dates => chai.expect(dates).to.be.empty)
      );

      it('return aggregated dates', () =>
        Promise.all([
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-02', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-03', 'foo', () => {}),
        ]).then(() => storage.aggregated.getAggregatedDates())
          .then(dates => chai.expect(dates).to.be.eql([
            '2017-01-01',
            '2017-01-02',
            '2017-01-03',
          ]))
      );
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () =>
        storage.aggregated.deleteOlderThan('2017-01-01')
      );

      it('deletes entries older entries', () =>
        Promise.all([
          storage.aggregated.runTaskAtMostOnce('2017-01-01', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-02', 'foo', () => {}),
          storage.aggregated.runTaskAtMostOnce('2017-01-03', 'foo', () => {}),
        ]).then(() => storage.aggregated.deleteOlderThan('2017-01-02'))
          .then(() => storage.aggregated.getAggregatedDates())
          .then(dates => chai.expect(dates).to.be.eql([
            '2017-01-02',
            '2017-01-03',
          ]))
      );
    });
  });

  describe('signal', () => {
    describe('#push', () => {
      it('resolves when adding signal', () =>
        storage.signals.push({ s: 1 })
      );

      it('allows identical signals to be pushed', () =>
        storage.signals.push({ s: 1 })
          .then(() => storage.signals.push({ s: 1 }))
          .then(() => storage.signals.getN(2))
          .then(signals => chai.expect(signals).to.be.eql([
            { signal: { s: 1 }, attempts: 0, date: '2017-01-01', id: 1 },
            { signal: { s: 1 }, attempts: 0, date: '2017-01-01', id: 2 },
          ]))
      );
    });

    describe('#remove', () => {
      it('does not fail if id did not exist', () =>
        storage.signals.remove(42)
      );

      it('does not fail if id is undefined', () =>
        storage.signals.remove(undefined)
      );

      it('does not fail if id is null', () =>
        storage.signals.remove(null)
      );

      it('deletes if id is valid', () =>
        storage.signals.push({ s: 1 })
          .then(() => storage.signals.remove(1))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.be.empty)
      );
    });

    describe('#getN', () => {
      it('returns empty list if there is no signals', () =>
        storage.signals.getN(1)
          .then(signals => chai.expect(signals).to.be.empty)
      );

      it('returns all available signals if N is bigger than queue size', () =>
        storage.signals.push({ s: 1 })
          .then(() => storage.signals.push({ s: 1 }))
          .then(() => storage.signals.getN(3))
          .then(signals => chai.expect(signals).to.have.length(2))
      );

      it('returns N signals if >N are available', () =>
        storage.signals.push({ s: 1 })
          .then(() => storage.signals.push({ s: 1 }))
          .then(() => storage.signals.getN(1))
          .then(signals => chai.expect(signals).to.have.length(1))
      );
    });

    describe('#deleteOlderThan', () => {
      it('resolves if there is nothing to do', () =>
        storage.signals.deleteOlderThan('2017-01-01')
      );

      it('deletes entries older entries', () =>
        storage.signals.push({})
          .then(() => storage.signals.deleteOlderThan('2018-01-01'))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.be.empty)
      );
    });

    it('robust to batch operations', async () => {
      await Promise.all([
        storage.signals.push({}),
        storage.signals.push({}),
        storage.signals.push({}),
        storage.signals.push({}),
      ]);

      chai.expect(await storage.signals.getAll()).to.eql([
        { id: 1, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 2, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 3, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
      ]);

      await Promise.all([
        storage.signals.push({}),
        storage.signals.remove(1),
        storage.signals.push({}),
        storage.signals.remove(2),
        storage.signals.remove(3),
      ]);

      chai.expect(await storage.signals.getAll()).to.eql([
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 5, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 6, signal: {}, attempts: 0, date: '2017-01-01' },
      ]);
      chai.expect(await storage.signals.getN(3)).to.eql([
        { id: 4, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 5, signal: {}, attempts: 0, date: '2017-01-01' },
        { id: 6, signal: {}, attempts: 0, date: '2017-01-01' },
      ]);
    });
  });

  describe('gid', () => {
    describe('get/set', () => {
      it('returns undefined if key does not exist', () => {
        chai.expect(storage.gid.get('foo')).to.be.undefined;
      });

      it('returns set value', () =>
        storage.gid.set('foo', 'bar')
          .then(() => {
            chai.expect(storage.gid.get('foo')).to.be.eql('bar');
          })
      );

      it('overrides existing value', () =>
        storage.gid.set('foo', 'bar')
          .then(() => storage.gid.set('foo', 'baz'))
          .then(() => {
            chai.expect(storage.gid.get('foo')).to.be.eql('baz');
          })
      );
    });

    describe('#entries', () => {
      it('returns all entries', () =>
        Promise.all([
          storage.gid.set('foo', JSON.stringify({ value: 1 })),
          storage.gid.set('bar', JSON.stringify({ value: 2 })),
          storage.gid.set('baz', JSON.stringify({ value: 3 })),
        ]).then(() => {
          chai.expect(storage.gid.entries()).to.be.eql([
            { key: 'foo', value: JSON.stringify({ value: 1 }) },
            { key: 'bar', value: JSON.stringify({ value: 2 }) },
            { key: 'baz', value: JSON.stringify({ value: 3 }) },
          ]);
        })
      );
    });
  });

  describe('behavior', () => {
    describe('#add', () => {
    });
    describe('#getTypesForDate', () => {
      it('should return records given complete timespan with records', () =>
        storage.behavior.add({ type: 'type_A', behavior: { value: 5 } })
          .then(() => storage.behavior.add({ type: 'type_B', behavior: { value: 6 } }))
          .then(() => storage.behavior.add({ type: 'type_A', behavior: { value: 7 } }))
          .then(() => storage.behavior.getTypesForDate(getFormattedCurrentDate()))
          .then((types) => {
            const records = types.toObj();
            chai.expect(records).to.contain.all.keys(['type_A', 'type_B']);
            chai.expect(records.type_A.length).to.equal(2);
            chai.expect(records.type_B.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
            chai.expect(records.type_A[1].value).to.equal(7);
            chai.expect(records.type_B[0].value).to.equal(6);
          })
      );

      it('should return records ordered by timestamp', async () => {
        await storage.behavior.add({ type: 'type_A', behavior: { value: 1 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 2 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 3 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 4 } });
        await storage.behavior.add({ type: 'type_A', behavior: { value: 5 } });
        const records = await storage.behavior.getTypesForDate(getFormattedCurrentDate());
        chai.expect(records.toObj().type_A).to.be.eql([
          { value: 1 },
          { value: 2 },
          { value: 3 },
          { value: 4 },
          { value: 5 },
        ]);
      });

      it('should return records given from timestamp with records', () =>
        storage.behavior.add({ type: 'type_A', behavior: { value: 5 } })
          .then(() => storage.behavior.getTypesForDate(getFormattedCurrentDate()))
          .then((types) => {
            const records = types.toObj();
            chai.expect(records).to.contain.all.keys(['type_A']);
            chai.expect(records.type_A.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
          })
      );

      it('should return records given from timestamp with records', () =>
        storage.behavior.add({ type: 'type_A', behavior: { value: 5 } })
          .then(() => storage.behavior.getTypesForDate(getFormattedCurrentDate()))
          .then((types) => {
            const records = types.toObj();
            chai.expect(records).to.contain.all.keys(['type_A']);
            chai.expect(records.type_A.length).to.equal(1);
            chai.expect(records.type_A[0].value).to.equal(5);
          })
      );

      it('should return empty object given complete timespan without records', () => {
        const previousDay = getCurrentMoment().subtract(1, 'days').format(DATE_FORMAT);
        return storage.behavior.add({ type: 'type_A', behavior: { value: 5 } })
          .then(() => storage.behavior.getTypesForDate(previousDay))
          .then(records => chai.expect(records.size).to.eql(0));
      });

      it('should return empty object given from timespan without records', () => {
        const nextDay = getCurrentMoment().add(1, 'days').format(DATE_FORMAT);
        return storage.behavior.add({ type: 'type_A', behavior: { value: 5 } })
          .then(() => storage.behavior.getTypesForDate(nextDay))
          .then(records => chai.expect(records.size).to.eql(0));
      });
    });

    describe('#deleteByDate', () => {
      it('should delete all records', () => {
        const addAtDate = (doc, date) => {
          setCurrentDate(date);
          return storage.behavior.add(doc);
        };

        const date = '2017-01-01';

        return addAtDate({ type: 'type_A', behavior: { value: 5 } }, date)
          .then(() => addAtDate({ type: 'type_B', behavior: { value: 6 } }, date))
          .then(() => addAtDate({ type: 'type_A', behavior: { value: 7 } }, date))
          .then(() => storage.behavior.deleteByDate(date))
          .then(() => storage.behavior.getTypesForDate(date))
          .then(records => chai.expect(records.size).to.eql(0));
      });
      it('should delete some records', () => {
        const addAtDate = (doc, date) => {
          setCurrentDate(date);
          return storage.behavior.add(doc);
        };

        return addAtDate({ type: 'type_A', behavior: { value: 5 } }, '2017-01-01')
          .then(() => addAtDate({ type: 'type_B', behavior: { value: 6 } }, '2017-01-02'))
          .then(() => addAtDate({ type: 'type_A', behavior: { value: 7 } }, '2017-01-02'))
          .then(() => storage.behavior.deleteByDate('2017-01-02'))
          .then(() => storage.behavior.getTypesForDate('2017-01-02'))
          .then(records => chai.expect(records.size).to.eql(0))
          .then(() => storage.behavior.getTypesForDate('2017-01-01'))
          .then(records => chai.expect(records.size).to.eql(1));
      });
    });
  });
};
