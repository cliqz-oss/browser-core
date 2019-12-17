/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  newTab,
  press,
  testServer,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import { getResourceUrl } from '../../../tests/core/integration/helpers';

const METRIC_NAME = 'search.metric.session.interaction';

export default function () {
  context('search.metric.session.interaction signal test', function () {
    const freshtabUrl = getResourceUrl('freshtab/home.html');

    context('for backend result without autocomplete', function () {
      const url = testServer.getBaseUrl('url-test');
      const query = 'test';

      beforeEach(async function () {
        // trigger search.metric.session.interaction signals that may be left from previous
        // tests and clear allTelemetry
        await blurUrlBar();
        win.allTelemetry = [];
        await testServer.registerPathHandler('/url-test', { result: '<html><body><p>success</p></body></html>' });
        await newTab(freshtabUrl);
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1);
        await waitFor(async () => {
          const $result = await $cliqzResults.querySelector(`a.result[data-url="${url}"]`);
          return $result;
        });
      });

      it('on Enter sends correct metric', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $result = await $cliqzResults.querySelector(`a.result[data-url="${url}"]`);
          return $result.classList.contains('selected');
        });
        press({ key: 'Enter' });
        await waitFor(async () => {
          const searchSignals = win.allTelemetry.filter(el => el.schema === METRIC_NAME);
          return expect(searchSignals).to.have.length(1);
        });

        const signal = win.allTelemetry.filter(el => el.schema === METRIC_NAME)[0].signal;
        expect(signal).to.deep.include({
          version: 4,
          hasUserInput: true,
          entryPoint: 'browserBar',
          highlightCount: 1,
          results: [
            {
              sources: [
                'default-search'
              ],
              classes: ['google']
            },
            {
              sources: [
                ''
              ],
              classes: []
            }
          ],
        });

        expect(signal).to.have.property('selection');
        expect(signal.selection).to.deep.include({
          action: 'enter',
          element: undefined,
          index: 1,
          isAutocomplete: false,
          isSearchEngine: false,
          sources: [
            ''
          ],
          classes: [],
          origin: 'cliqz',
          queryLength: query.length,
          subResult: {}
        });
        expect(signal.selection).to.have.property('showTime');
      });
    });

    context('for backend result with autocomplete', function () {
      const url = testServer.getBaseUrl('url-test');
      const query = 'local';

      beforeEach(async function () {
        await testServer.registerPathHandler('/url-test', { result: '<html><body><p>success</p></body></html>' });
        await newTab(freshtabUrl);
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1);
        await waitFor(async () => {
          const $result = await $cliqzResults.querySelector(`a.result[data-url="${url}"]`);
          return $result;
        });
      });

      it('on Enter sends correct metric', async function () {
        press({ key: 'Enter' });
        await waitFor(async () => {
          const searchSignals = win.allTelemetry.filter(el => el.schema === METRIC_NAME);
          return expect(searchSignals).to.have.length(1);
        });

        const signal = win.allTelemetry.filter(el => el.schema === METRIC_NAME)[0].signal;

        expect(signal).to.deep.include({
          version: 4,
          hasUserInput: true,
          entryPoint: 'browserBar',
          highlightCount: 0,
          results: [
            {
              sources: [
                ''
              ],
              classes: []
            }
          ],
        });

        expect(signal).to.have.property('selection');
        expect(signal.selection).to.deep.include({
          action: 'enter',
          element: undefined,
          index: 0,
          isAutocomplete: true,
          isSearchEngine: false,
          sources: [
            ''
          ],
          classes: [],
          origin: 'cliqz',
          queryLength: query.length,
          subResult: {}
        });
        expect(signal.selection).to.have.property('showTime');
      });
    });
  });
}
