/* global chai */
/* global describeModule */

const moment = require('moment');
const mockDexie = require('../../core/unit/utils/dexie');

export default describeModule('history-analyzer/indexed-stream',
  () => ({
    ...mockDexie,
    'platform/lib/moment': {
      default: moment,
    },
    'core/assert': {
      default() {},
    },
    'history-analyzer/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    let stream;

    beforeEach(function initIndexedStream() {
      const IndexedStream = this.module().default;
      stream = new IndexedStream('test');
      return stream.init();
    });

    afterEach(() => stream.destroy());

    it('#pushMany', () =>
      stream.pushMany([
        { ts: 1, tokens: new Uint32Array([1]) },
        { ts: 2, tokens: new Uint32Array([2]) },
        { ts: 3, tokens: new Uint32Array([1, 2]) },
      ]).then(() => stream.all())
        .then(events => chai.expect(events).to.be.eql([
          { id: 1, ts: 1, tokens: new Uint32Array([1]) },
          { id: 2, ts: 2, tokens: new Uint32Array([2]) },
          { id: 3, ts: 3, tokens: new Uint32Array([1, 2]) },
        ]))
    );

    describe('#query', () => {
      const d1 = moment('2017-01-01', 'YYYYMMDD').valueOf();
      const d2 = moment('2017-01-02', 'YYYYMMDD').valueOf();
      const d3 = moment('2017-01-03', 'YYYYMMDD').valueOf();

      beforeEach(() => stream.pushMany([
        { ts: d1, tokens: new Uint32Array([1]) },
        { ts: d1 + 1, tokens: new Uint32Array([2]) },
        { ts: d2, tokens: new Uint32Array([1, 2]) },
        { ts: d2 + 1, tokens: new Uint32Array([3]) },
        { ts: d3, tokens: new Uint32Array([2, 3]) },
        { ts: d3 + 1, tokens: new Uint32Array([1, 3]) },
      ]));

      it('no tokens and not timespan', () =>
        stream.query()
          .then(events => chai.expect(events).to.be.eql([]))
      );

      it('matches with one token', () =>
        stream.query({ tokens: new Uint32Array([1]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 1, ts: d1, tokens: new Uint32Array([1]) },
            { id: 3, ts: d2, tokens: new Uint32Array([1, 2]) },
            { id: 6, ts: d3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens', () =>
        stream.query({ tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 2, ts: d1 + 1, tokens: new Uint32Array([2]) },
            { id: 3, ts: d2, tokens: new Uint32Array([1, 2]) },
            { id: 4, ts: d2 + 1, tokens: new Uint32Array([3]) },
            { id: 5, ts: d3, tokens: new Uint32Array([2, 3]) },
            { id: 6, ts: d3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens and timespan (after)', () =>
        stream.query({ after: d2, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 5, ts: d3, tokens: new Uint32Array([2, 3]) },
            { id: 6, ts: d3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens and timespan (before)', () =>
        stream.query({ before: d2, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 2, ts: d1 + 1, tokens: new Uint32Array([2]) },
          ]))
      );

      it('matches with two tokens and timespan (after + before)', () =>
        stream.query({ after: d1, before: d3, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 3, ts: d2, tokens: new Uint32Array([1, 2]) },
            { id: 4, ts: d2 + 1, tokens: new Uint32Array([3]) },
          ]))
      );
    });
  }
);
