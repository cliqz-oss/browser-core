/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  click,
  expect,
  getLocalisedString,
  getResourceUrl,
  newTab,
  prefs,
  mockPref,
  queryHTML,
  waitFor,
  waitForPrefChange,
} from '../../../tests/core/integration/helpers';

export default function () {
  const privacyStatementUrl = getResourceUrl('human-web/humanweb.html');
  const privacyCheckboxSelector = 'input#enableHumanWeb';

  describe('HumanWeb privacy statement page', function () {
    let privacyPageContent;
    let privacyCheckboxState;

    beforeEach(async function () {
      await app.modules['human-web'].isReady();
    });

    describe('renders', function () {
      beforeEach(async function () {
        await newTab(privacyStatementUrl);
        await waitFor(async () => {
          const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="hw_page_header"]', 'innerText');
          return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
        });
      });

      it('with correct text', async function () {
        privacyPageContent = await queryHTML(privacyStatementUrl, '#container', 'innerHTML');

        expect(privacyPageContent).to.have.length(1);


        ['header', 'privacy_statement', 'data_collection', 'one_for_all',
          'cliqz_desc', 'cliqz_hw_desc', 'cliqz_desc_extended',
          'participation_disclaimer', 'choice', 'participate'].forEach((k) => {
          expect(privacyPageContent[0]).to.contain(getLocalisedString(`hw_page_${k}`));
        });
      });

      it('with "humanWebOptOut" pref set to false and ticked checkbox as default', async function () {
        expect(Boolean(prefs.get('humanWebOptOut'), false)).to.be.false;
        await waitFor(async () => {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          expect(privacyCheckboxState).to.have.length(1);
          return expect(privacyCheckboxState[0]).to.be.true;
        });
      });
    });

    [true, false].forEach((prefState) => {
      context(`when "humanWebOptOut" pref is set to ${prefState}`, function () {
        let unmockPref;
        beforeEach(async function () {
          unmockPref = await mockPref('humanWebOptOut', prefState);

          await newTab(privacyStatementUrl);
          await waitFor(async () => {
            const $pageHeaders = await queryHTML(privacyStatementUrl, 'h1[key="hw_page_header"]', 'innerText');
            return (($pageHeaders.length !== 0) && ($pageHeaders[0] !== ''));
          });
        });

        afterEach(async function () {
          unmockPref();
        });

        it(`renders with consent checkbox ${prefState ? '' : 'not'} checked`, async function () {
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length === 1)
              && (privacyCheckboxState[0] === !prefState));
          });
        });
      });
    });

    context('clicking on the consent checkbox', function () {
      beforeEach(async function () {
        await newTab(privacyStatementUrl);

        await waitFor(async () => {
          privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
          return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === true));
        });
      });

      context('once', function () {
        beforeEach(async function () {
          await click(privacyStatementUrl, privacyCheckboxSelector);
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === false));
          });
        });

        afterEach(async function () {
          const prefChanged = waitForPrefChange('humanWebOptOut');
          prefs.set('humanWebOptOut', false);
          await prefChanged;
        });

        it('flips "humanWebOptOut" pref to true', () => waitFor(
          () => expect(prefs.get('humanWebOptOut')).to.equal(true),
          2000,
        ));
      });

      context('twice', function () {
        beforeEach(async function () {
          await click(privacyStatementUrl, privacyCheckboxSelector);
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === false));
          });

          await click(privacyStatementUrl, privacyCheckboxSelector);
          await waitFor(async () => {
            privacyCheckboxState = await queryHTML(privacyStatementUrl, privacyCheckboxSelector, 'checked');
            return ((privacyCheckboxState.length > 0) && (privacyCheckboxState[0] === true));
          });
        });

        it('flips "humanWebOptOut" pref to false', () => waitFor(
          () => expect(prefs.get('humanWebOptOut')).to.equal(false),
          2000,
        ));
      });
    });
  });
}
