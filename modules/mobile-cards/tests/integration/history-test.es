import {
  closeTab,
  expect,
  newTab,
  prefs,
  waitFor,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  checkComplementarySearchCard,
  checkMainUrl,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import { getDetailsFromUrl } from '../../../core/url';

import { getMessage } from '../../../core/i18n';

import historyResults from '../../../tests/core/integration/fixtures/historyResultsHistoryCluster';

export default function () {
  describe('for history mobile cards', function () {
    const logoVersion = prefs.get('config_logoVersion');
    const historyContainerSelector = '[aria-label="history-container"]';
    const historyHeaderSelector = '[aria-label="history-header"]';
    const historyResultSelector = '[aria-label="history-result"]';
    const headerSelector = '[aria-label="header-container"]';

    context('for single result', function () {
      let id;
      const results = historyResults.slice(0, 1);

      before(async function () {
        win.preventRestarts = true;

        id = await newTab(cardsUrl);
        withHistory(results);
        await mockSearch({});
        win.CLIQZ.app.modules.search.action('startSearch', 'amazon', { tab: { id } });
        await waitForElement({
          url: cardsUrl,
          selector: '[aria-label="mobile-result"]',
          isPresent: true
        });
      });

      after(async function () {
        await closeTab(id);
        win.preventRestarts = false;
        win.CLIQZ.app.modules.search.action('stopSearch');
      });

      checkMainUrl({ url: cardsUrl, mainUrl: results[0].value });

      context('card header', function () {
        it('is rendered successfully', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
        });

        it('renders correct friendlyUrl', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $friendlyUrl = $cardHeaders[0].querySelector('[aria-label="generic-link"]');
          expect($friendlyUrl).to.exist;
          expect($friendlyUrl.innerText)
            .to.equal(getDetailsFromUrl(results[0].value).friendly_url);
        });

        it('renders https lock logo', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $logo = $cardHeaders[0].querySelector('[aria-label="https-lock"] img');
          expect($logo).to.exist;
          expect($logo.src).to.contain('img/https_lock.svg');
        });

        it('renders correct logo', async function () {
          let $logo;
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
          await waitFor(() => {
            $logo = $cardHeaders[0].querySelector('[aria-label="generic-logo"] img');
            expect($logo).to.exist;
            return expect($logo.src).to.contain(`https://cdn.cliqz.com/brands-database/database/${logoVersion}/logos/amazon/$.svg`);
          }, 10000);
        });
      });

      checkComplementarySearchCard({ url: cardsUrl });
    });

    context('for cluster with main domain in history', function () {
      let id;
      const results = historyResults;

      before(async function () {
        win.preventRestarts = true;

        id = await newTab(cardsUrl);
        await mockSearch({});
        withHistory(results);
        win.CLIQZ.app.modules.search.action('startSearch', 'amazon', { tab: { id } });
        await waitForElement({
          url: cardsUrl,
          selector: '[aria-label="mobile-result"]',
          isPresent: true
        });
      });

      after(async function () {
        await closeTab(id);
        win.preventRestarts = false;
        win.CLIQZ.app.modules.search.action('stopSearch');
      });

      checkMainUrl({ url: cardsUrl, mainUrl: results[0].value });

      context('card header', function () {
        it('is rendered successfully', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
        });

        it('renders correct friendlyUrl', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $friendlyUrl = $cardHeaders[0].querySelector('[aria-label="generic-link"]');
          expect($friendlyUrl).to.exist;
          expect($friendlyUrl.innerText)
            .to.equal(getDetailsFromUrl(results[0].value).friendly_url);
        });

        it('renders https lock logo', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $logo = $cardHeaders[0].querySelector('[aria-label="https-lock"] img');
          expect($logo).to.exist;
          expect($logo.src).to.contain('img/https_lock.svg');
        });

        it('renders correct logo', async function () {
          let $logo;
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
          await waitFor(() => {
            $logo = $cardHeaders[0].querySelector('[aria-label="generic-logo"] img');
            expect($logo).to.exist;
            return expect($logo.src).to.contain(`https://cdn.cliqz.com/brands-database/database/${logoVersion}/logos/amazon/$.svg`);
          }, 10000);
        });
      });

      it('renders title', async function () {
        const $titles = await getElements({
          elementSelector: '[aria-label="generic-title"]',
          url: cardsUrl,
        });

        expect($titles).to.have.length(1);
        expect($titles[0].textContent).to.equal(results[0].comment);
      });

      context('history container', function () {
        it('rendered successfully', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers).to.have.length(1);
        });

        it('with title', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers[0].querySelector(historyHeaderSelector)).to.exist;
          expect($containers[0].querySelector(historyHeaderSelector))
            .to.have.text(getMessage('mobile_history_card_title'));
        });

        it('with correct number of history results', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers[0].querySelectorAll(historyResultSelector))
            .to.have.length(results.length - 1);
        });

        context('for each history result', function () {
          it('renders url', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length - 1);

            [...$historyResults].forEach(($result, ind) => {
              expect($result.querySelector('[aria-label="history-link"]')).to.exist;
              expect($result.querySelector('[aria-label="history-link"]'))
                .to.have.text(results[ind + 1].value);
            });
          });

          it('renders title', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length - 1);

            [...$historyResults].forEach(($result, ind) => {
              expect($result.querySelector('[aria-label="history-title"]')).to.exist;
              expect($result.querySelector('[aria-label="history-title"]'))
                .to.have.text(results[ind + 1].comment);
            });
          });

          it('link is correct', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length - 1);

            [...$historyResults].forEach(($result, ind) => {
              expect($result).to.have.attribute('data-url');
              expect($result.getAttribute('data-url')).to.equal(results[ind + 1].value);
            });
          });
        });
      });

      checkComplementarySearchCard({ url: cardsUrl });
    });

    context('for cluster without main domain in history', function () {
      let id;
      const results = historyResults.slice(1);

      before(async function () {
        win.preventRestarts = true;

        id = await newTab(cardsUrl);
        await mockSearch({});
        withHistory(results);
        win.CLIQZ.app.modules.search.action('startSearch', 'amazon', { tab: { id } });
        await waitForElement({
          url: cardsUrl,
          selector: '[aria-label="mobile-result"]',
          isPresent: true
        });
      });

      after(async function () {
        await closeTab(id);
        win.preventRestarts = false;
        win.CLIQZ.app.modules.search.action('stopSearch');
      });

      checkMainUrl({ url: cardsUrl, mainUrl: 'https://partnernet.amazon.de/' });

      context('card header', function () {
        it('is rendered successfully', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
        });

        it('renders correct friendlyUrl', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $friendlyUrl = $cardHeaders[0].querySelector('[aria-label="generic-link"]');
          expect($friendlyUrl).to.exist;
          expect($friendlyUrl.innerText).to.equal('partnernet.amazon.de');
        });

        it('renders https lock logo', async function () {
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);

          const $logo = $cardHeaders[0].querySelector('[aria-label="https-lock"] img');
          expect($logo).to.exist;
          expect($logo.src).to.contain('img/https_lock.svg');
        });

        it('renders correct logo', async function () {
          let $logo;
          const $cardHeaders = await getElements({
            elementSelector: headerSelector,
            url: cardsUrl,
          });

          expect($cardHeaders).to.have.length(1);
          await waitFor(() => {
            $logo = $cardHeaders[0].querySelector('[aria-label="generic-logo"] img');
            expect($logo).to.exist;
            return expect($logo.src).to.contain(`https://cdn.cliqz.com/brands-database/database/${logoVersion}/logos/amazon/$.svg`);
          }, 10000);
        });
      });

      it('renders title', async function () {
        const $titles = await getElements({
          elementSelector: '[aria-label="generic-title"]',
          url: cardsUrl,
        });

        expect($titles).to.have.length(1);
        expect($titles[0].textContent).to.equal('partnernet.amazon.de');
      });

      context('history container', function () {
        it('rendered successfully', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers).to.have.length(1);
        });

        it('with title', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers[0].querySelector(historyHeaderSelector)).to.exist;
          expect($containers[0].querySelector(historyHeaderSelector))
            .to.have.text(getMessage('mobile_history_card_title'));
        });

        it('with correct number of history results', async function () {
          const $containers = await getElements({
            elementSelector: historyContainerSelector,
            url: cardsUrl,
          });

          expect($containers[0].querySelectorAll(historyResultSelector))
            .to.have.length(results.length);
        });

        context('for each history result', function () {
          it('renders url', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length);

            [...$historyResults].forEach(($result, ind) => {
              expect($result.querySelector('[aria-label="history-link"]')).to.exist;
              expect($result.querySelector('[aria-label="history-link"]'))
                .to.have.text(results[ind].value);
            });
          });

          it('renders title', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length);

            [...$historyResults].forEach(($result, ind) => {
              expect($result.querySelector('[aria-label="history-title"]')).to.exist;
              expect($result.querySelector('[aria-label="history-title"]'))
                .to.have.text(results[ind].comment);
            });
          });

          it('link is correct', async function () {
            const $containers = await getElements({
              elementSelector: historyContainerSelector,
              url: cardsUrl,
            });

            const $historyResults = $containers[0].querySelectorAll(historyResultSelector);

            expect($historyResults).to.have.length(results.length);

            [...$historyResults].forEach(($result, ind) => {
              expect($result).to.have.attribute('data-url');
              expect($result.getAttribute('data-url')).to.equal(results[ind].value);
            });
          });
        });
      });

      checkComplementarySearchCard({ url: cardsUrl });
    });
  });
}
