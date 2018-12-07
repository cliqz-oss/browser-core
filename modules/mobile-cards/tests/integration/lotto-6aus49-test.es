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

import results from '../../../tests/core/integration/fixtures/resultsLotto6Aus49';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  const rowSelector = '[aria-label="lotto-row"]';
  const elementSelector = '[aria-label="lotto-element"]';

  describe('for a lotto 6 aus 49 mobile cards result', function () {
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

    describe('renders lotto 6 Aus 49 results', function () {
      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus49 = $allLottoRows[0];
        const $allAus49Elements = $aus49.querySelectorAll(elementSelector);
        expect($allAus49Elements.length).to.equal(7);
        const $6Aus49Numbers = [...$allAus49Elements].slice(0, 6);

        [...$6Aus49Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen[i]
          );
        });
      });

      it('with a correct value of Superzahl', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus49 = $allLottoRows[0];
        const $allAus49Elements = $aus49.querySelectorAll(elementSelector);
        const $superZahl = $allAus49Elements[6];

        expect($superZahl).to.contain.text(
          results[0].snippet.extra.lotto_list.cur_date.lotto.superzahl
        );
      });

      it('with a correct label of Superzahl', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $aus49 = $allLottoRows[0];
        const $superZahlLabel = $aus49.querySelector('[aria-label="lotto-desc"]');

        expect($superZahlLabel).to.exist;
        expect($superZahlLabel).to.have.text(getMessage('lotto_superzahl'));
      });
    });

    describe('renders Spiel77 results', function () {
      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $spiel77 = $allLottoRows[1];
        const $allSpiel77Elements = $spiel77.querySelectorAll(elementSelector);
        expect($allSpiel77Elements.length).to.equal(8);

        const $spiel77Numbers = [...$allSpiel77Elements].slice(1);
        [...$spiel77Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $spiel77 = $allLottoRows[1];
        const $allSpiel77Elements = $spiel77.querySelectorAll(elementSelector);
        const $spiel77Label = [...$allSpiel77Elements][0];

        expect($spiel77Label).to.contain.text('Spiel77');
      });
    });

    describe('renders Super6 results', function () {
      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $super6 = $allLottoRows[2];
        const $allSuper6Elements = $super6.querySelectorAll(elementSelector);
        expect($allSuper6Elements.length).to.equal(7);

        const $super6Numbers = [...$allSuper6Elements].slice(1);
        [...$super6Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        const $super6 = $allLottoRows[2];
        const $allSuper6Elements = $super6.querySelectorAll(elementSelector);
        const $super6Label = [...$allSuper6Elements][0];

        expect($super6Label).to.contain.text('Super6');
      });
    });

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
