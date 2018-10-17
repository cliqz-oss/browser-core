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
  checkPoweredBySection,
  getElements,
  mockSearch,
} from './helpers';

import results from '../../../tests/core/integration/fixtures/mobile/resultsSoccerTable';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a soccer game mobile cards result', function () {
    let id;

    const headerContainerSelector = '[aria-label="soccer-header-container"]';
    const rankingContainerSelector = '[aria-label="soccer-ranking-container"]';
    const rowsNumber = results[0].snippet.extra.ranking.length;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'bundesliga tabelle', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'bundesliga' });
    checkPoweredBySection({ url: cardsUrl });

    it('doesn\'t render subscribe button', async function () {
      const $subscribe = await getElements({
        elementSelector: '[aria-label="subscribe-button"]',
        url: cardsUrl,
      });

      expect($subscribe).to.have.length(0);
    });

    context('renders soccer header section', function () {
      it('successfully', async function () {
        const $headerContainer = await getElements({
          elementSelector: headerContainerSelector,
          url: cardsUrl,
        });
        expect($headerContainer).to.have.length(1);
      });

      it('with correct header', async function () {
        const $headers = await getElements({
          elementSelector: `${headerContainerSelector} [aria-label="soccer-header-header"]`,
          url: cardsUrl,
        });
        expect($headers).to.have.length(1);
        expect($headers[0]).to.have.text('Mannschaft');
      });

      it('with correct sp', async function () {
        const $headerSp = await getElements({
          elementSelector: `${headerContainerSelector} [aria-label="soccer-header-sp"]`,
          url: cardsUrl,
        });
        expect($headerSp).to.have.length(1);
        expect($headerSp[0]).to.have.text('SP');
      });

      it('with correct td', async function () {
        const $headerTd = await getElements({
          elementSelector: `${headerContainerSelector} [aria-label="soccer-header-td"]`,
          url: cardsUrl,
        });
        expect($headerTd).to.have.length(1);
        expect($headerTd[0]).to.have.text('TD');
      });

      it('with correct pkt', async function () {
        const $headerPkt = await getElements({
          elementSelector: `${headerContainerSelector} [aria-label="soccer-header-pkt"]`,
          url: cardsUrl,
        });
        expect($headerPkt).to.have.length(1);
        expect($headerPkt[0]).to.have.text('PKT');
      });
    });

    context('each row of ranking table', function () {
      it('has a correct rank', async function () {
        const $allRows = await getElements({
          elementSelector: rankingContainerSelector,
          url: cardsUrl,
        });

        expect($allRows).to.have.length(rowsNumber);
        [...$allRows].forEach(function ($row, i) {
          const $rank = $row.querySelector('[aria-label="soccer-ranking-rank"]');
          expect($rank).to.exist;
          expect($rank).to.have.text(`${results[0].snippet.extra.ranking[i].rank}.`);
        });
      });

      it('has a correct club name', async function () {
        const $allRows = await getElements({
          elementSelector: rankingContainerSelector,
          url: cardsUrl,
        });

        expect($allRows).to.have.length(rowsNumber);
        [...$allRows].forEach(function ($row, i) {
          const $club = $row.querySelector('[aria-label="soccer-ranking-club"]');
          expect($club).to.exist;
          expect($club).to.have.text(results[0].snippet.extra.ranking[i].club);
        });
      });

      it('has a correct sp', async function () {
        const $allRows = await getElements({
          elementSelector: rankingContainerSelector,
          url: cardsUrl,
        });

        expect($allRows).to.have.length(rowsNumber);
        [...$allRows].forEach(function ($row, i) {
          const $sp = $row.querySelector('[aria-label="soccer-ranking-sp"]');
          expect($sp).to.exist;
          expect($sp).to.have.text(results[0].snippet.extra.ranking[i].SP.toString());
        });
      });

      it('has a correct td', async function () {
        const $allRows = await getElements({
          elementSelector: rankingContainerSelector,
          url: cardsUrl,
        });

        expect($allRows).to.have.length(rowsNumber);
        [...$allRows].forEach(function ($row, i) {
          const $td = $row.querySelector('[aria-label="soccer-ranking-td"]');
          expect($td).to.exist;
          expect($td).to.have.text(results[0].snippet.extra.ranking[i].TD.toString());
        });
      });

      it('has a correct pkt', async function () {
        const $allRows = await getElements({
          elementSelector: rankingContainerSelector,
          url: cardsUrl,
        });

        expect($allRows).to.have.length(rowsNumber);
        [...$allRows].forEach(function ($row, i) {
          const $pkt = $row.querySelector('[aria-label="soccer-ranking-pkt"]');
          expect($pkt).to.exist;
          expect($pkt).to.have.text(results[0].snippet.extra.ranking[i].PKT.toString());
        });
      });
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
