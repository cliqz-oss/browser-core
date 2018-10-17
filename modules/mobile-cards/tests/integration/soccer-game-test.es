import {
  closeTab,
  expect,
  newTab,
  waitFor,
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

import results from '../../../tests/core/integration/fixtures/mobile/resultsSoccerLigaGame';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a soccer game mobile cards result', function () {
    let id;
    const soccerAreaSelector = '[aria-label="soccer"]';
    const rowSelector = '[aria-label="soccer-game-container"]';
    const hostSelector = '[aria-label="soccer-game-host"]';
    const guestSelector = '[aria-label="soccer-game-guest"]';
    const scoreSelector = '[aria-label="soccer-game-status"]';
    const dateSelector = '[aria-label="soccer-game-date"]';
    const locationSelector = '[aria-label="soccer-game-location"]';
    const leagueLogoSelector = '[aria-label="soccer-game-logo"] img';

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'fc bayern', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'fcbayern' });
    checkPoweredBySection({ url: cardsUrl });

    it('doesn\'t render subscribe button', async function () {
      const $subscribe = await getElements({
        elementSelector: '[aria-label="subscribe-button"]',
        url: cardsUrl,
      });

      expect($subscribe).to.have.length(0);
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

    it('renders main image', async function () {
      await waitFor(async () => {
        const $images = await getElements({
          elementSelector: '[aria-label="main-image"] img',
          url: cardsUrl,
        });

        expect($images).to.have.length(1);
        expect($images[0].src).to.exist;
        return expect($images[0].src).to.equal(results[0].snippet.extra.og.image);
      }, 5000);
    });

    context('renders results table', function () {
      it('successfully', async function () {
        const $soccerTable = await getElements({
          elementSelector: soccerAreaSelector,
          url: cardsUrl,
        });
        expect($soccerTable).to.have.length(1);
      });

      it('with details of correct amount of matches', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });
        expect($allRows.length).to.equal(2);
      });
    });

    context('each table match row', function () {
      it('has a correct URL', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          expect($row).to.have.attribute('data-url');
          expect($row.getAttribute('data-url'))
            .to.equal(results[0].snippet.extra.matches[1 - i].live_url);
        });
      });

      it('has correct names of two teams', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const hostTeamItem = $row.querySelector(hostSelector);
          const guestTeamItem = $row.querySelector(guestSelector);
          expect(hostTeamItem).to.have.text(results[0].snippet.extra.matches[1 - i].HOST);
          expect(guestTeamItem).to.have.text(results[0].snippet.extra.matches[1 - i].GUESS);
        });
      });

      it('has a result with correct two numbers', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $score = $row.querySelector(scoreSelector);
          expect($score)
            .to.contain.text(results[0].snippet.extra.matches[1 - i].scored);
        });
      });

      it('has correct date and time', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $soccerDateItem = $row.querySelector(dateSelector);
          expect($soccerDateItem).to.exist;
          expect($soccerDateItem).to.have.text(
            `${results[0].snippet.extra.matches[1 - i].gameDate} (${results[0].snippet.extra.matches[1 - i].gameTime})`
          );
        });
      });

      it('has an existing location', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $soccerLocationItem = $row.querySelector(locationSelector);
          expect($soccerLocationItem)
            .to.have.text(results[0].snippet.extra.matches[1 - i].location);
        });
      });

      it('has a correct league logo', async function () {
        const $allRows = await getElements({
          elementSelector: rowSelector,
          url: cardsUrl,
        });

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $leagueLogo = $row.querySelector(leagueLogoSelector);

          expect($leagueLogo).to.exist;
          expect($leagueLogo.src).to.contain(results[0].snippet.extra.matches[1 - i].leagueLogo);
        });
      });
    });

    context('renders news area', function () {
      it('renders news element', async function () {
        const $news = await getElements({
          elementSelector: '[aria-label="news-item"]',
          url: cardsUrl,
        });
        expect($news).to.have.length(1);
      });

      it('renders with correct image', async function () {
        const $images = await getElements({
          elementSelector: '[aria-label="news-image"] img',
          url: cardsUrl,
        });

        expect($images[0].src).to.exist;
        expect($images[0].src)
          .to.contain(results[0].snippet.deepResults[1].links[0].extra.thumbnail);
      });

      it('renders with correct title', async function () {
        const $newsTitles = await getElements({
          elementSelector: '[aria-label="news-title"]',
          url: cardsUrl,
        });

        expect($newsTitles[0].textContent)
          .to.contain(results[0].snippet.deepResults[1].links[0].title);
      });

      it('renders with an existing timestamp', async function () {
        const $newsTimestamp = await getElements({
          elementSelector: '[aria-label="news-timestamp"]',
          url: cardsUrl,
        });
        expect($newsTimestamp).to.have.length(1);
      });

      it('renders with correct url', async function () {
        const $news = await getElements({
          elementSelector: '[aria-label="news-item"]',
          url: cardsUrl,
        });

        expect($news[0].dataset.url).to.exist;
        expect($news[0].dataset.url)
          .to.equal(results[0].snippet.deepResults[1].links[0].url);
      });
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
