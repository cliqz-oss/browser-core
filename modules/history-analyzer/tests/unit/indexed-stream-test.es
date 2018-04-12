/* global chai */
/* global describeModule */

const mockDexie = require('../../core/unit/utils/dexie');

const HOUR = 1000 * 60 * 60;

export default describeModule('history-analyzer/indexed-stream',
  () => ({
    ...mockDexie,
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

    beforeEach(function () {
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
      const h1 = (0 * HOUR) + 1;
      const h2 = (1 * HOUR) + 1;
      const h3 = (2 * HOUR) + 1;

      beforeEach(() => stream.pushMany([
        /* id: 1 */ { ts: h1, tokens: new Uint32Array([1]) },
        /* id: 2 */ { ts: h1 + 1, tokens: new Uint32Array([2]) },
        /* id: 3 */ { ts: h2, tokens: new Uint32Array([1, 2]) },
        /* id: 4 */ { ts: h2 + 1, tokens: new Uint32Array([3]) },
        /* id: 5 */ { ts: h3, tokens: new Uint32Array([2, 3]) },
        /* id: 6 */ { ts: h3 + 1, tokens: new Uint32Array([1, 3]) },
      ]));

      it('no tokens and not timespan', () =>
        stream.query()
          .then(events => chai.expect(events).to.be.eql([]))
      );

      it('matches with one token', () =>
        stream.query({ tokens: new Uint32Array([1]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 1, ts: h1, tokens: new Uint32Array([1]) },
            { id: 3, ts: h2, tokens: new Uint32Array([1, 2]) },
            { id: 6, ts: h3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens', () =>
        stream.query({ tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 2, ts: h1 + 1, tokens: new Uint32Array([2]) },
            { id: 3, ts: h2, tokens: new Uint32Array([1, 2]) },
            { id: 4, ts: h2 + 1, tokens: new Uint32Array([3]) },
            { id: 5, ts: h3, tokens: new Uint32Array([2, 3]) },
            { id: 6, ts: h3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens and timespan (after)', () =>
        stream.query({ after: h2, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 5, ts: h3, tokens: new Uint32Array([2, 3]) },
            { id: 6, ts: h3 + 1, tokens: new Uint32Array([1, 3]) },
          ]))
      );

      it('matches with two tokens and timespan (before)', () =>
        stream.query({ before: h2, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 2, ts: h1 + 1, tokens: new Uint32Array([2]) },
          ]))
      );

      it('matches with two tokens and timespan (after + before)', () =>
        stream.query({ after: h1, before: h3, tokens: new Uint32Array([2, 3]) })
          .then(events => chai.expect(events).to.be.eql([
            { id: 3, ts: h2, tokens: new Uint32Array([1, 2]) },
            { id: 4, ts: h2 + 1, tokens: new Uint32Array([3]) },
          ]))
      );
    });
  }
);
