/* global chai */
/* global describeModule */

const moment = require('moment');
const mockDexie = require('../utils/dexie');

export default describeModule('core/persistence/event-store',
  () => ({
    ...mockDexie,
    'platform/lib/moment': {
      default: moment,
    },
    'core/assert': {
      default() {},
    },
  }),
  () => {
    let sortEventsByTs;
    let store;

    beforeEach(function () {
      sortEventsByTs = this.module().sortEventsByTs;
      const EventStore = this.module().default;
      store = new EventStore('test');
      return store.init();
    });

    afterEach(() => store.destroy());

    describe('#sortEventsByTs', () => {
      it('empty list', () => {
        chai.expect(sortEventsByTs([])).to.be.eql([]);
      });

      it('one element', () => {
        chai.expect(sortEventsByTs([{ ts: 1 }])).to.be.eql([{ ts: 1 }]);
      });

      it('sorts correctly on ts', () => {
        chai.expect(sortEventsByTs([
          { ts: 1 },
          { ts: 0 },
          { ts: 3 },
          { ts: 5 },
          { ts: 4 },
          { ts: 6 },
          { ts: 2 },
        ])).to.be.eql([
          { ts: 0 },
          { ts: 1 },
          { ts: 2 },
          { ts: 3 },
          { ts: 4 },
          { ts: 5 },
          { ts: 6 },
        ]);
      });
    });

    describe('#pushMany', () => {
      it('empty list', () =>
        store.pushMany([])
          .then(() => store.query())
          .then(events => chai.expect(events).to.be.eql([])));

      it('one event', () =>
        store.pushMany([{ ts: 1 }])
          .then(() => store.query())
          .then(events => chai.expect(events).to.be.eql([{ ts: 1, id: 1 }])));

      it('several events', () =>
        store.pushMany([
          { ts: 1 },
          { ts: 4 },
          { ts: 3 },
          { ts: 2 },
        ]).then(() => store.query())
          .then(events => chai.expect(events).to.be.eql([
            { ts: 1, id: 1 },
            { ts: 2, id: 4 },
            { ts: 3, id: 3 },
            { ts: 4, id: 2 },
          ])));
    });

    it('#latestTs', () =>
      store.pushMany([
        { ts: 1 },
        { ts: 4 },
        { ts: 3 },
        { ts: 2 },
        { ts: 42 },
        { ts: 5 },
      ]).then(() => store.latestTs())
        .then(ts => chai.expect(ts).to.be.eql(42)));

    it('#query', () =>
      store.pushMany([
        { ts: 1 },
        { ts: 4 },
        { ts: 3 },
        { ts: 2 },
        { ts: 42 },
        { ts: 5 },
      ]).then(() => store.query({}))
        .then(events => chai.expect(events).to.be.eql([
          { id: 1, ts: 1 },
          { id: 4, ts: 2 },
          { id: 3, ts: 3 },
          { id: 2, ts: 4 },
          { id: 6, ts: 5 },
          { id: 5, ts: 42 },
        ]))
        .then(() => store.query({ before: 2 }))
        .then(events => chai.expect(events).to.be.eql([
          { id: 1, ts: 1 },
        ]))
        .then(() => store.query({ after: 4 }))
        .then(events => chai.expect(events).to.be.eql([
          { id: 6, ts: 5 },
          { id: 5, ts: 42 },
        ]))
        .then(() => store.query({ after: 2, before: 5 }))
        .then(events => chai.expect(events).to.be.eql([
          { id: 3, ts: 3 },
          { id: 2, ts: 4 },
        ])));

    it('#deleteDataOlderThan', () =>
      store.pushMany([
        { ts: 1 },
        { ts: 4 },
        { ts: 3 },
        { ts: 2 },
        { ts: 42 },
        { ts: 5 },
      ]).then(() => store.deleteDataOlderThan(4))
        .then(() => store.query())
        .then(events => chai.expect(events).to.be.eql([
          { id: 2, ts: 4 },
          { id: 6, ts: 5 },
          { id: 5, ts: 42 },
        ])));
  });
