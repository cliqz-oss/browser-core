import {
  closeTab,
  expect,
  newTab,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  checkComplementarySearchCard,
  checkHeader,
  checkMainUrl,
  checkMoreOn,
  checkTapMessage,
  getElements,
  getLocalisedString,
  mockSearch,
  withHistory,
} from './helpers';

import results from '../../../tests/core/integration/fixtures/resultsCurrencyConverter';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a currency mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', '1 euro to usd', { tab: { id } });
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

    checkMainUrl({ url: cardsUrl, mainUrl: results[0].url });
    checkHeader({ url: cardsUrl, results, imageName: 'xe' });

    it('renders correct title', async function () {
      const $titles = await getElements({
        elementSelector: '[aria-label="generic-title"]',
        url: cardsUrl,
      });

      expect($titles).to.have.length(1);
      expect($titles[0].textContent).to.contain(results[0].snippet.extra.toCurrency);
      expect($titles[0].textContent).to.contain(results[0].snippet.extra.toSymbol);
      expect($titles[0].textContent).to.contain('1.15');
    });

    it('renders correct "no guarantee" message', async function () {
      const $descriptions = await getElements({
        elementSelector: '[aria-label="generic-title-meta"]',
        url: cardsUrl,
      });
      const descriptionString = getLocalisedString('no_legal_disclaimer');

      expect($descriptions).to.have.length(1);
      expect($descriptions[0].textContent).to.equal(descriptionString);
    });

    checkTapMessage({ url: cardsUrl });

    it('renders 7 rows of multiplications', async function () {
      const $multiplicationArea = await getElements({
        elementSelector: '[aria-label="currency-multi"]',
        url: cardsUrl,
      });
      const $multiplicationRowsEur = await getElements({
        elementSelector: '[aria-label="currency-multi-row-from"]',
        url: cardsUrl,
      });
      const $multiplicationRowsUsd = await getElements({
        elementSelector: '[aria-label="currency-multi-row-to"]',
        url: cardsUrl,
      });

      expect($multiplicationArea).to.have.length(1);
      expect($multiplicationRowsEur).to.have.length(7);
      expect($multiplicationRowsUsd).to.have.length(7);
    });

    context('each multiplication row', function () {
      let $multiplicationRowsEur;
      let $multiplicationRowsUsd;

      it('renders correct currency', async function () {
        $multiplicationRowsEur = await getElements({
          elementSelector: '[aria-label="currency-multi-row-from"]',
          url: cardsUrl,
        });
        $multiplicationRowsUsd = await getElements({
          elementSelector: '[aria-label="currency-multi-row-to"]',
          url: cardsUrl,
        });

        expect($multiplicationRowsEur.length).to.be.above(0);
        [...$multiplicationRowsEur].forEach(function ($row) {
          expect($row.textContent).to.contain('EUR');
        });

        expect($multiplicationRowsUsd.length).to.be.above(0);
        [...$multiplicationRowsUsd].forEach(function ($row) {
          expect($row.textContent).to.contain('USD');
        });
      });

      it('renders correct values', async function () {
        const multiplicationResults = [
          { eur: 1, usd: 1.15 },
          { eur: 10, usd: 11.47 },
          { eur: 50, usd: 57.33 },
          { eur: 100, usd: 114.65 },
          { eur: 200, usd: 229.3 },
          { eur: 500, usd: 573.25 },
          { eur: 1000, usd: 1146.5 },
        ];
        $multiplicationRowsEur = await getElements({
          elementSelector: '[aria-label="currency-multi-row-from"]',
          url: cardsUrl,
        });
        $multiplicationRowsUsd = await getElements({
          elementSelector: '[aria-label="currency-multi-row-to"]',
          url: cardsUrl,
        });

        expect($multiplicationRowsEur.length).to.be.above(0);
        [...$multiplicationRowsEur].forEach(function ($row, i) {
          expect($row.textContent).to.contain(multiplicationResults[i].eur);
        });

        expect($multiplicationRowsUsd.length).to.be.above(0);
        [...$multiplicationRowsUsd].forEach(function ($row, i) {
          expect($row.textContent).to.contain(multiplicationResults[i].usd);
        });
      });
    });

    checkMoreOn({ url: cardsUrl, moreUrl: 'XE.com' });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
