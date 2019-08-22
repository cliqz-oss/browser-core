/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  expect,
  getResourceUrl,
  newTab,
  queryHTML,
  waitFor,
  waitForElement,
} from '../../../tests/core/integration/helpers';

export default function () {
  const url = getResourceUrl('freshtab/home.html');

  context('Freshtab', function () {
    describe('opened in a new tab', function () {
      beforeEach(async function () {
        // Load freshtab in new tab
        await newTab(url, { focus: true });
        await waitForElement({ url, selector: '#section-most-visited .dial-header' });
      });

      it('renders successfully', async () => {
        const $mostVisitedHeader = await queryHTML(url, '#section-most-visited .dial-header', 'innerText');
        expect($mostVisitedHeader).to.have.length(1);

        await waitFor(async () => {
          const $search = await queryHTML(url, '.search', 'nodeName');
          return expect($search).to.have.length(1);
        });

        await waitFor(async () => {
          const $news = await queryHTML(url, '.news', 'nodeName');
          return expect($news).to.have.length(1);
        });
      });
    });
  });
}
