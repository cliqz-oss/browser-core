/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  expect,
  getElements,
  getLocalisedString,
  getPage,
  newTab,
  queryHTML,
  testServer,
  waitFor,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

const fishyUrl = getPage('phishy');
const warningUrl = 'chrome://cliqz/content/anti-phishing/phishing-warning.html?u=';
const encodedFullUrl = warningUrl + encodeURIComponent(fishyUrl);

async function setupTestServer() {
  const noCacheHeaders = [
    { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    { name: 'Pragma', value: 'no-cache' },
    { name: 'Expires', value: '0' },
  ];

  await testServer.registerPathHandler('/integration_tests/phishy', { result: '<html><body><p>Very phishy page</p></body></html>', headers: noCacheHeaders });
}

export default function () {
  describe('Anti-phishing', function () {
    xcontext('when turned on', function () {
      let oldIsPhishingURL;

      before(async function () {
        await setupTestServer();
        oldIsPhishingURL = app.modules['anti-phishing'].background.actions.isPhishingURL;
        app.modules['anti-phishing'].background.actions.isPhishingURL = () =>
          Promise.resolve({
            block: true,
            type: 'phishingURL',
          });

        await newTab(fishyUrl, { focus: true });
      });

      after(function () {
        app.modules['anti-phishing'].background.actions.isPhishingURL = oldIsPhishingURL;
      });

      describe('renders the warning page', function () {
        const mainWarningSelector = '.cqz-anti-phishing-warning';
        let $mainElement;

        before(async function () {
          await waitForElement({
            url: encodedFullUrl,
            selector: mainWarningSelector,
          });

          $mainElement = await getElements({
            elementSelector: mainWarningSelector,
            parentElementSelector: 'body',
            url: encodedFullUrl,
          });
          expect($mainElement).to.have.length(1);
        });

        it('with red background', async function () {
          waitFor(() => expect(win.getComputedStyle($mainElement[0]).backgroundColor)
            .to.equal('rgb(233, 42, 41)'));
        });

        it('with a warning image', function () {
          const $warningImage = $mainElement[0].querySelector('.cqz-title img');

          expect($warningImage).to.exist;
          expect($warningImage.src).to.exist;
          expect($warningImage.src).to.contain('white-warning');
        });

        it('with a header', function () {
          const $header = $mainElement[0].querySelector('.cqz-title .cliqz-locale');

          expect($header).to.exist;
          expect($header).to.have.text(getLocalisedString('anti_phishing_txt0'));
        });

        it('with a full warning message', function () {
          const $message = $mainElement[0].querySelector('.cqz-info');

          expect($message).to.exist;
          expect($message).to.contain.text(getLocalisedString('anti_phishing_txt1'));
          expect($message).to.contain.text(fishyUrl);
          expect($message).to.contain.text(getLocalisedString('anti_phishing_txt2'));
        });

        it('with a "Learn more" link', function () {
          const $learnMore = $mainElement[0].querySelector('#learn-more');

          expect($learnMore).to.exist;
          expect($learnMore.href).to.exist;
          expect($learnMore).to.contain.text(getLocalisedString('anti_phishing_txt3'));
          expect($learnMore.href).to.equal('https://cliqz.com/whycliqz/anti-phishing');
        });

        it('with a "Go to a safe website" button', function () {
          const $safeWebsiteBtn = $mainElement[0].querySelector('.cqz-button-save-out');

          expect($safeWebsiteBtn).to.exist;
          expect($safeWebsiteBtn).to.contain.text(getLocalisedString('anti_phishing_txt4'));
        });

        it('with a "Report this page as safe" button', function () {
          const $reportBtn = $mainElement[0].querySelector('#report-safe');

          expect($reportBtn).to.exist;
          expect($reportBtn).to.contain.text(getLocalisedString('anti_phishing_txt5'));
        });

        it('with a "Proceed despite risks" button', function () {
          const $proceedBtn = $mainElement[0].querySelector('#proceed');

          expect($proceedBtn).to.exist;
          expect($proceedBtn).to.contain.text(getLocalisedString('anti_phishing_txt6'));
        });
      });
    });

    context('when turned off', function () {
      before(async function () {
        await setupTestServer();
        app.modules['anti-phishing'].background.unload();
        await newTab(fishyUrl, { focus: true });
        await waitForElement({
          url: fishyUrl,
          selector: 'body',
        });
      });

      after(async function () {
        await app.modules['anti-phishing'].background.init();
      });

      it('renders the target page', async function () {
        await waitFor(async () => {
          const fishyPageContent = await queryHTML(fishyUrl, 'body', 'textContent');
          expect(fishyPageContent).to.have.length(1);
          return expect(fishyPageContent[0]).to.equal('Very phishy page');
        });
      });
    });
  });
}
