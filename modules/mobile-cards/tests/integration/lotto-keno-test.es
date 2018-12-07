import {
  closeTab,
  expect,
  newTab,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  checkButtons,
  checkComplementarySearchCard,
  checkHeader,
  checkMainUrl,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import { getMessage } from '../../../core/i18n';

import results from '../../../tests/core/integration/fixtures/resultsLottoKeno';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  const rowSelector = '[aria-label="lotto-row"]';
  const elementSelector = '[aria-label="lotto-element"]';

  describe('for a lotto keno mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;
      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'lotto', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'lotto' });

    it('renders correct header', async function () {
      const $header = await getElements({
        elementSelector: '[aria-label="lotto-header"]',
        url: cardsUrl,
      });

      expect($header).to.have.length(1);
      expect($header[0]).to.contain.text(getMessage('lotto_gewinnzahlen'));
      expect($header[0]).to.contain.text('Wednesday');
      expect($header[0]).to.contain.text('7/19/2017');
    });

    it('renders correct title', async function () {
      const $titles = await getElements({
        elementSelector: '[aria-label="generic-title"]',
        url: cardsUrl,
      });

      expect($titles).to.have.length(1);
      expect($titles[0].textContent).to.equal(results[0].snippet.title);
    });

    it('renders correct description', async function () {
      const $descriptions = await getElements({
        elementSelector: '[aria-label="generic-desc"]',
        url: cardsUrl,
      });

      expect($descriptions).to.have.length(1);
      expect($descriptions[0].textContent).to.equal(results[0].snippet.description);
    });

    describe('renders Keno results', function () {
      it('with correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        [0, 1].forEach(function (row) {
          const $kenoResults = $allLottoRows[row].querySelectorAll(elementSelector);
          expect($kenoResults.length).to.equal(10);
          [...$kenoResults].forEach(function (element, i) {
            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen[(10 * row) + i]
            );
          });
        });
      });
    });

    describe('renders plus5 results', function () {
      it('with correct value of numerical elelements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $allPlus5Elements = $allLottoRows[2].querySelectorAll(elementSelector);
        expect($allPlus5Elements.length)
          .to.equal(6);
        const $plus5Numbers = [...$allPlus5Elements].slice(1);
        [...$plus5Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.plus5.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $allPlus5Elements = $allLottoRows[2].querySelectorAll(elementSelector);
        const $plus5Label = $allPlus5Elements[0];
        expect($plus5Label).to.contain.text('plus5');
      });
    });

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
