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
} from './helpers';

import { getMessage } from '../../../core/i18n';

import results from '../../../tests/core/integration/fixtures/resultsLottoEurojackpot';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  const rowSelector = '[aria-label="lotto-row"]';
  const elementSelector = '[aria-label="lotto-element"]';
  const labelSelector = '[aria-label="lotto-desc"]';

  describe('for a lotto jackpot mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;
      id = await newTab(cardsUrl);
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

    describe('renders 5 aus 50 results', function () {
      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus50 = $allLottoRows[0];
        const $allAus50Elements = $aus50.querySelectorAll(elementSelector);

        expect($allAus50Elements.length).to.equal(5);
        [...$allAus50Elements].forEach(function (element, i) {
          expect(element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus50 = $allLottoRows[0];
        const $aus50Label = $aus50.querySelector(labelSelector);

        expect($aus50Label).to.exist;
        expect($aus50Label).to.have.text('5 aus 50');
      });
    });

    describe('renders 2 aus 10 results', function () {
      it('with correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus10 = $allLottoRows[1];
        const $all2Aus10Elements = $aus10.querySelectorAll(elementSelector);

        expect($all2Aus10Elements.length).to.equal(2);
        [...$all2Aus10Elements].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus10 = $allLottoRows[1];
        const $aus10Label = $aus10.querySelector(labelSelector);

        expect($aus10Label).to.exist;
        expect($aus10Label).to.have.text('2 aus 10');
      });
    });

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
