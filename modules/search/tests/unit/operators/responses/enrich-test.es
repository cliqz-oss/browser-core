/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
  'search/operators/links/utils': {
    getMainLink: ({ links }) => links[0],
  },
  'search/operators/results/deduplicate': {
    default: x => x,
  },
  'search/logger': {
    default: {
      debug: x => x,
    }
  }
};

export default describeModule('search/operators/responses/enrich',
  () => mock,
  () => {
    describe('#enrich', function () {
      let enrich;

      beforeEach(function () {
        enrich = this.module().default;
      });

      it('adds rich data', function () {
        const richData = {
          foo: {
            bar: 'foo',
          },
        };

        const backendResponse = {
          results: [
            {
              links: [
                {
                  foo: 'backend_foo',
                  meta: { url: 'cliqz.de', type: 'main' },
                  type: 'rh',
                  style: 'backend_style',
                  kind: ['backend_kind'],
                  text: 'backend_text',
                  provider: 'backend_provider',
                  extra: { rich_data: richData },
                },
                {
                  meta: { url: 'cliqz.de/news', type: 'news' },
                  style: 'backend_style',
                  kind: ['backend_kind'],
                  provider: 'backend_provider',
                },
                {
                  meta: { url: 'cliqz.de/jobs', type: 'news' },
                  style: 'backend_style',
                  kind: ['backend_kind'],
                  provider: 'backend_provider',
                },
              ],
            }
          ],
        };

        const historyResponse = {
          results: [
            {
              links: [
                {
                  foo: 'history_foo',
                  url: 'cliqz.de',
                  meta: { url: 'cliqz.de', type: 'main' },
                  style: 'history_style',
                  kind: ['history_kind'],
                  text: 'history_text',
                  provider: 'history_provider',
                  extra: { history: 'extra' },
                },
                {
                  meta: { url: 'cliqz.de/news', type: 'history' },
                  provider: 'history_provider',
                  style: 'history_style',
                  kind: ['history_kind'],
                },
                {
                  meta: { url: 'cliqz.de/team', type: 'history' },
                  provider: 'history_provider',
                  style: 'history_style',
                  kind: ['history_kind'],
                },
              ],
            }
          ],
        };

        const enrichedResponse = {
          results: [
            {
              links: [
                // Main link
                {
                  foo: 'backend_foo',
                  type: 'rh',
                  style: 'history_style backend_style',
                  provider: 'history_provider',
                  kind: ['history_kind'],
                  text: 'history_text',
                  extra: {
                    rich_data: richData,
                    history: 'extra',
                  },
                  meta: {
                    url: 'cliqz.de',
                    type: 'main',
                    originalUrl: 'cliqz.de',
                    isEnriched: true,
                  }
                },
                // Sublink from backend; this order is intentional:
                // sublinks from backend need to come before history
                // sublinks for `limit-results` to work as intended
                {
                  meta: { url: 'cliqz.de/jobs', type: 'news' },
                  style: 'backend_style',
                  kind: ['backend_kind'],
                  provider: 'backend_provider',
                },
                // Sublink from history (enriched)
                {
                  meta: { url: 'cliqz.de/news', type: 'news' },
                  provider: 'history_provider',
                  style: 'history_style backend_style',
                  kind: ['backend_kind', 'history_kind'],
                },
                // Sublink from history
                {
                  meta: { url: 'cliqz.de/team', type: 'history' },
                  provider: 'history_provider',
                  style: 'history_style',
                  kind: ['history_kind'],
                },
              ],
            },
          ],
        };

        chai.expect(enrich(historyResponse, backendResponse, new Map()))
          .to.deep.equal(enrichedResponse);
      });
    });
  });
