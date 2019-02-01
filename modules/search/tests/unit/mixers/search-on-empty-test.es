/* global chai, describeModule */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;

const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
  'search/responses': {
    getEmptyResponse: () => 'e',
  },
};

export default describeModule('search/mixers/search-on-empty',
  () => mock,
  () => {
    describe('#searchOnEmpty', function () {
      let searchOnEmpty;

      beforeEach(function () {
        searchOnEmpty = this.module().searchOnEmpty;
      });

      it('searches using provider if base stream concludes without results', function () {
        const { hot, flush, getMessages, e, cold } = rxSandbox.create();

        const query = '';
        const provider = {
          search: () => cold('s-ss|'),
        };
        const base$ = hot('----n|', {
          n: {
            results: [],
            state: 'done'
          }
        });
        const expected = e('  ----s-ss|');

        const messages = getMessages(searchOnEmpty(provider, base$, query, {}, {}));
        flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits empty response if base stream concludes with results ', function () {
        const { hot, flush, getMessages, e } = rxSandbox.create();

        const query = '';
        const provider = {
          search: () => hot('s|'),
        };
        const base$ = hot('----n|', {
          n: {
            results: ['r1'],
            state: 'done'
          }
        });
        const expected = e('  -----(e|)');

        const messages = getMessages(searchOnEmpty(provider, base$, query, {}, {}));
        flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
