/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

export default function () {
  describe('mixer test', function () {
    const historyUrl1 = 'https://test1.com';
    const backendUrl1 = 'https://testbackend.com';
    const history1Selector = `.history .result[data-url="${historyUrl1}"]`;
    const backend1Selector = `.result[data-url="${backendUrl1}"`;

    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('query length >= 4', function () {
      context('sent 1 backend, then 1 history', function () {
        const query = 'test ';
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: [{ url: backendUrl1 }] });
          withHistory([{ value: historyUrl1 }], 600);
        });

        it('backend result is shown, then history result is shown', async function () {
          fillIn(query);
          await waitForPopup(1);
          expect(await $cliqzResults.querySelector(backend1Selector)).to.exist;
          expect(await $cliqzResults.querySelector(history1Selector)).to.not.exist;
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(history1Selector)).to.exist);
        });
      });
    });

    context('query length < 4', function () {
      context('sent 1 backend, then 1 history', function () {
        const query = 'tes';
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: [{ url: backendUrl1 }] });
          withHistory([{ value: historyUrl1 }], 600);
        });

        it('both results are shown at the same time', async function () {
          fillIn(query);
          await waitForPopup();
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(backend1Selector)).to.exist);
          expect(await $cliqzResults.querySelector(history1Selector)).to.exist;
        });
      });
    });
  });
}
