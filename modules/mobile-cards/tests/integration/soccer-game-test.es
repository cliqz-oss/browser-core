import {
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
  getElements,
  mockSearch,
} from './helpers';

import { getMessage } from '../../../core/i18n';

import results from '../../../tests/core/integration/fixtures/mobile/resultsSoccerLigaGame';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a soccer game mobile cards result', function () {
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

      const id = await newTab(cardsUrl);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'fc bayern', { tab: { id } });
      await waitForElement({
        url: cardsUrl,
        selector: '[aria-label="mobile-result"]',
        isPresent: true
      });
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkHeader({ url: cardsUrl, results, imageName: 'fcbayern' });

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

    context('"subscribe" section', function () {
      it('exists', async function () {
        const $subscribeSection = await getElements({
          elementSelector: '[aria-label="subscribe"]',
          url: cardsUrl,
        });

        expect($subscribeSection).to.have.length(1);
      });

      it('with the "Subscribe" button', async function () {
        const $subscribeButton = await getElements({
          elementSelector: '[aria-label="subscribe-button"]',
          url: cardsUrl,
        });

        expect($subscribeButton).to.have.length(1);
        expect($subscribeButton[0]).to.have.text('Subscribe');
      });

      it('with the correct text', async function () {
        const $subscribeMessage = await getElements({
          elementSelector: '[aria-label="subscribe-text"]',
          url: cardsUrl,
        });

        expect($subscribeMessage).to.have.length(1);
        expect($subscribeMessage[0])
          .to.have.text(
            getMessage('mobile_soccer_subscribe_team', results[0].snippet.extra.matches[0].club)
          );
      });
    });

    context('"powered by" section', function () {
      it('with correct url', async function () {
        const $poweredByUrl = await getElements({
          elementSelector: '[aria-label="powered-by"]',
          url: cardsUrl,
        });

        expect($poweredByUrl).to.have.length(1);
        expect($poweredByUrl[0]).to.have.attribute('data-url');
        expect($poweredByUrl[0].getAttribute('data-url'))
          .to.equal('http://www.kicker.de/?gomobile=1');
      });

      // TODO Ping @tamara-cliqz to write this properly when EX-8005 is fixed
      xit('icon', async function () {
        const $poweredByIcon = await getElements({
          elementSelector: '[aria-label="powered-icon"]',
          url: cardsUrl,
        });

        expect($poweredByIcon).to.have.length(1);
      });

      it('text', async function () {
        const $poweredByText = await getElements({
          elementSelector: '[aria-label="powered-by-text"]',
          url: cardsUrl,
        });

        expect($poweredByText).to.have.length(1);
        expect($poweredByText[0]).to.have.text(getMessage('KickerSponsor'));
      });
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
