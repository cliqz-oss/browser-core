/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

export default describeModule('offers-v2/operations/history',
  () => ({
    'offers-v2/logging_handler': {
      default: {}
    },
    'core/cliqz': {
      utils: {}
    },
    'core/crypto/random': {
    },
  }),
  () => {
    describe('/history operations', () => {
      let ops;
      let eventLoop;
      let resultHookedFunc;

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultHookedFunc = args;
      }

      beforeEach(function () {
        ops = this.module().default;
      });

      /**
       * ==================================================
       * $match_history operation tests
       * ==================================================
       */
      describe('/match_history', () => {
        let op;
        beforeEach(function () {
          op = ops.$match_history;
          resultHookedFunc = undefined;
        });

        it('/history is empty', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => [],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'amazon.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(0);
                chai.expect(resultHookedFunc[1]).eql({ '#url': 'https://amazon.de/basket' });
              },
              (error) => {
                chai.assert.fail(error, 0, error);
              }
            ),
          ]);
        });

        it('/not in history', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => ['https://www.ebay.de/basket'],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'amazon.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(0);
                chai.expect(resultHookedFunc[1]).eql({ '#url': 'https://amazon.de/basket' });
              },
              (error) => {
                chai.assert.fail(error, 0, error);
              }
            ),
          ]);
        });

        it('/pattern doesn\'t match', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => ['https://www.ebay.de/basket'],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'ebay.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(0);
                chai.expect(resultHookedFunc).eql(undefined);
              },
              (error) => {
                chai.assert.fail(error, 0, error);
              }
            ),
          ]);
        });

        it('/in history/one record', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => [{ url: 'https://amazon.de/basket' }],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'amazon.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(1);
                chai.expect(resultHookedFunc[1]).eql({ '#url': 'https://amazon.de/basket' });
              },
              (error) => {
                chai.assert.fail(error, 1, error);
              }
            ),
          ]);
        });

        it('/in history/three records', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => [
                { url: 'https://ebay.de/basket/step1' },
                { url: 'https://amazon.de/basket/step1' },
                { url: 'https://amazon.de/basket/step2' },
                { url: 'https://amazon.de/basket/thankyou' }],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'amazon.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(3);
                chai.expect(resultHookedFunc[1]).eql({ '#url': 'https://amazon.de/basket' });
              },
              (error) => {
                chai.assert.fail(error, 3, error);
              }
            ),
          ]);
        });

        it('/in history/multiple patterns/four records', () => {
          mockEventLoop({
            historyIndex: {
              queryHistory: (start, end) => [
                { url: 'https://ebay.de/basket/step1' },
                { url: 'https://amazon.de/basket/step1' },
                { url: 'https://amazon.de/basket/step2' },
                { url: 'https://amazon.de/basket/thankyou' }],
              addUrl: (url, context) => hookedFunc(url, context)
            },
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
          });

          return Promise.all([
            op.call(this, [60, 2, 'ebay.de', 'amazon.de/basket'], eventLoop, { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(4);
                chai.expect(resultHookedFunc[1]).eql({ '#url': 'https://amazon.de/basket' });
              },
              (error) => {
                chai.assert.fail(error, 4, error);
              }
            ),
          ]);
        });
      });
    });
  },
);
