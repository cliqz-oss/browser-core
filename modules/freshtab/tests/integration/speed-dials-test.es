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
  waitFor,
  waitForElement,
  mockPref,
  click,
  elementAction,
  EventUtils,
} from '../../../tests/core/integration/helpers';
import config from '../../../core/config';

const DIALS_PREF = 'extensions.cliqzLocal.freshtab.speedDials';
const isDesktopBrowser = config.specific === 'browser';
const mockedTopSites = [
  {
    url: 'https://facebook.com/',
    title: 'Facebook',
  },
  {
    url: 'https://youtube.com/',
    title: 'Youtube',
  },
];
const mockCustom = {
  custom: [
    { url: 'https://bild.de/' },
    { url: 'https://www.spiegel.de/' },
  ]
};
const testDial = {
  url: 'https://cliqz.com/',
  title: 'Cliqz',
};

function mockedTopDomains({ exclude = [] } = {}) {
  const e = new Set(exclude);
  return Promise.resolve(mockedTopSites.filter(s => !e.has(s.url)));
}

async function fillTextInput(url, selector, value) {
  await waitForElement({ url, selector: selector });
  elementAction(url, selector, 'focus');
  elementAction(url, selector, 'select');
  await EventUtils.sendString(value);
  await waitFor(async () => {
    const [v] = await queryHTML(url, selector, 'value');
    return v === value;
  });
}

export default function () {
  const url = getResourceUrl('freshtab/home.html');

  context('Freshtab', function () {
    if (!isDesktopBrowser) {
      return;
    }

    describe('Speed dials', function () {
      let unmockTopDomains = null;
      let unmockPref = null;

      beforeEach(async function () {
        unmockTopDomains = mockBackgroundProp(
          'browser.cliqzHistory.topDomains',
          mockedTopDomains
        );
        unmockPref = await mockPref(DIALS_PREF, JSON.stringify(mockCustom));
        await newTab(url, { focus: true });
        await waitForElement({ url, selector: '#section-favorites .dial' });
      });

      afterEach(function () {
        unmockTopDomains();
        unmockPref();
      });

      it('adds a new custom speed dial', async () => {
        click(url, '#section-favorites .plus-dial-icon');
        await fillTextInput(url, '.addDialForm .addUrl', testDial.url);
        await fillTextInput(url, '.addDialForm input.title', testDial.title);
        click(url, '.addDialForm button[type=submit]');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-favorites .dial', 'href');
          return $mostVisitedHrefs[2] === testDial.url;
        });
        const $mostVisitedTitles = await queryHTML(url, '#section-favorites .dial .title', 'textContent');
        expect($mostVisitedTitles[2]).to.be.equal(testDial.title);
      });

      it('edits an existing custom speed dial', async () => {
        click(url, '#section-favorites .dial button.edit');
        await fillTextInput(url, '.editForm input.url', testDial.url);
        await fillTextInput(url, '.editForm input.title', testDial.title);
        click(url, '.editForm button[type=submit]');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-favorites .dial', 'href');
          return $mostVisitedHrefs[0] === testDial.url;
        });
      });

      it('removes an existing custom speed dial', async () => {
        click(url, '#section-favorites .dial button.edit');
        await waitForElement({ url, selector: '.editForm button.deleteDial' });
        click(url, '.editForm button.deleteDial');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-favorites .dial', 'href');
          return $mostVisitedHrefs[0] === mockCustom.custom[1].url;
        });
      });

      it('hides an existing most visited speed dial from', async () => {
        click(url, '#section-most-visited .dial button.delete');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-most-visited .dial', 'href');
          return $mostVisitedHrefs[0] === mockedTopSites[1].url;
        });
      });

      it('restores a removed custom speed dial', async () => {
        click(url, '#section-favorites .dial button.edit');
        await waitForElement({ url, selector: '.editForm button.deleteDial' });
        click(url, '.editForm button.deleteDial');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-favorites .dial', 'href');
          return $mostVisitedHrefs.length === 2;
        });
        await waitForElement({ url, selector: '#undo-close' });
        click(url, '#undo-close');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-favorites .dial', 'href');
          return $mostVisitedHrefs.length === 3;
        });
      });

      it('restores a hidden visited speed dial from', async () => {
        click(url, '#section-most-visited .dial button.delete');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-most-visited .dial', 'href');
          return $mostVisitedHrefs[0] === mockedTopSites[1].url;
        });
        await waitForElement({ url, selector: '#undo-close' });
        click(url, '#undo-close');
        await waitFor(async () => {
          const $mostVisitedHrefs = await queryHTML(url, '#section-most-visited .dial', 'href');
          return $mostVisitedHrefs[0] === mockedTopSites[0].url;
        });
      });
    });
  });
}
