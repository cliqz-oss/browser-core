/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const Rx = require('rxjs');
const operators = require('rxjs/operators');
const rxSandbox = require('rx-sandbox').rxSandbox;

const { of } = Rx;
const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
  'search/logger': {
    default: {
      log() {},
      debug() {},
    }
  },
  'search/operators/normalize': {
    getMainLink: ({ links }) => links[0]
  },
  'core/kord/inject': {
    default: {
      module() {
        return {
          action(action, ...args) {
            if (action === 'expandQuery') {
              return Promise.resolve('codepen');
            }

            if (action === 'mergeResults') {
              console.log(args);
              return Promise.resolve(args[0].concat[args[1]]);
            }

            return Promise.reject(new Error(`No such action: ${action}`));
          }
        };
      },
      service() {
        return {
          push() {}
        };
      }
    }
  }
};

export default describeModule('search/mixers/context-search',
  () => mock,
  () => {
    describe('#contextSearch', function () {
      let contextSearch;

      beforeEach(function () {
        const ContextSearch = this.module().default;
        contextSearch = new ContextSearch();
      });

      it('returns original results if context search is not enabled', function () {
        const { hot, flush, getMessages, e } = rxSandbox.create();

        const query = 'code';
        const provider = {
          search: () => hot('|')
        };

        const results$ = hot('-n|', {
          n: {
            results: ['r1'],
            state: 'done'
          }
        });

        const config = {
          mixers: {
            'context-search': {
              isEnabled: false
            }
          }
        };
        const expected = e('-n|', {
          n: {
            results: ['r1'],
            state: 'done'
          }
        });

        const messages = getMessages(contextSearch.search(provider, results$, query, config, {}));
        flush();
        return chai.expect(messages).to.deep.equal(expected);
      });


      it('expands query and merges the expanded results with the original results', () => {
        const { hot, flush, getMessages, e, cold } = rxSandbox.create();

        const query = 'code';
        const expansion$ = of('codepen');
        const provider = {
          search: () => cold('e|', {
            e: {
              results: ['e1', 'e2'],
              state: 'done'
            }
          })
        };

        const results$ = hot('r|', {
          r: {
            results: ['r1', 'r2'],
            state: 'done'
          }
        });

        const config = {
          mixers: {
            'context-search': {
              isEnabled: true
            }
          }
        };

        const expected = e('e|', {
          e: {
            results: ['r1', 'r2', 'e1', 'e2'],
            state: 'done',
          }
        });

        const mix = contextSearch.mix.bind(contextSearch);
        contextSearch.mergeResults = () => of({
          results: ['r1', 'r2', 'e1', 'e2'],
          state: 'done'
        });
        // contextSearch.mergeResults = ['r1', 'r2', 'e1', 'e2'];

        const messages = getMessages(mix(expansion$, provider, results$, query, config, {}));
        flush();
        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
