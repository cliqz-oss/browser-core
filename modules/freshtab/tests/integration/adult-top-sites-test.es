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
  mockBackgroundProp,
  waitForElement,
} from '../../../tests/core/integration/helpers';
import config from '../../../core/config';

const isDesktopBrowser = config.specific === 'browser';

export default function () {
  const url = getResourceUrl('freshtab/home.html');

  context('Freshtab', function () {
    if (!isDesktopBrowser) {
      return;
    }

    describe('with top sites containing adult domain', function () {
      let unmockTopDomains = null;
      const mockedTopSites = [
        {
          url: 'https://facebook.com/',
          title: 'Facebook',
          isAdult: false,
        },
        {
          url: 'https://www.pornhub.com/',
          title: 'Pornhub',
          isAdult: true,
        }
      ];

      beforeEach(async function () {
        unmockTopDomains = mockBackgroundProp(
          'browser.cliqzHistory.topDomains',
          () => Promise.resolve(mockedTopSites)
        );
        await newTab(url, { focus: true });
        await waitForElement({ url, selector: '#section-most-visited .dial' });
      });

      afterEach(function () {
        unmockTopDomains();
      });

      it('should show only non-adult sites (EX-9143)', async () => {
        const $mostVisitedHrefs = await queryHTML(url, '#section-most-visited .dial', 'href');
        mockedTopSites
          .filter(site => !site.isAdult)
          .forEach((site, i) => {
            expect($mostVisitedHrefs[i]).to.be.equal(site.url);
          });
      });
    });
  });
}
