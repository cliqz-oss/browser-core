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

import results from '../../../tests/core/integration/fixtures/resultsLottoGluecksspirale';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  const rowSelector = '[aria-label="lotto-row"]';
  const classSelector = '[aria-label="lotto-desc"]';
  const elementSelector = '[aria-label="lotto-element"]';

  describe('for a lotto gluecksspirale mobile cards result', function () {
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

    describe('each Lotto row result', function () {
      it('renders with correct results', async function () {
        const $allLottoRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allLottoRows.length).to.equal(2);
        [...$allLottoRows].forEach(function ($row, i) {
          const $allRowElements = $row.querySelectorAll(elementSelector);

          expect($allRowElements.length).to.equal(7);
          [...$allRowElements].forEach(function ($element, j) {
            expect($element)
              .to.contain.text(results[0].snippet.extra
                .lotto_list.cur_date.gs.gewinnzahlen[6][i][j]);
          });
        });
      });

      it('with correct winning classes', async function () {
        const $classes = await getElements({
          elementSelector: classSelector,
          url: cardsUrl,
        });

        expect($classes.length).to.equal(2);

        [...$classes].forEach(function ($cl) {
          expect($cl).to.have.text('Gewinnklasse 7');
        });
      });
    });

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
