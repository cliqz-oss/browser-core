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

import results from '../../../tests/core/integration/fixtures/mobile/resultsSoccerLiveticker';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for liveticker mobile cards result', function () {
    let id;
    const daysNumber = results[0].snippet.extra.matches.length;
    const matchesSelector = '[aria-label="liveticker-matches"]';
    const matchesDatesSelector = '[aria-label="liveticker-matches-date"]';

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'liveticker bundesliga', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'li', isDefault: true });
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
      it('with correct number of days', async function () {
        const $matches = await getElements({
          elementSelector: matchesSelector,
          url: cardsUrl,
        });
        expect($matches).to.have.length(daysNumber);
      });

      it('with correct dates', async function () {
        const $matchesDates = await getElements({
          elementSelector: matchesDatesSelector,
          url: cardsUrl,
        });

        expect($matchesDates).to.have.length(daysNumber);
        [...$matchesDates].forEach(($date, i) => {
          expect($date).to.have.text(results[0].snippet.extra.matches[i].date);
        });
      });

      context('for each day', function () {
        it('with correct number of games', async function () {
          const $matches = await getElements({
            elementSelector: matchesSelector,
            url: cardsUrl,
          });

          expect($matches).to.have.length(daysNumber);
          [...$matches].forEach(($match, i) => {
            expect($match.querySelectorAll('[aria-label="liveticker-game-container"]').length)
              .to.equal(results[0].snippet.extra.matches[i].matches.length);
          });
        });

        context('for each game', function () {
          it('with correct url', async function () {
            const $matches = await getElements({
              elementSelector: matchesSelector,
              url: cardsUrl,
            });

            expect($matches).to.have.length(daysNumber);
            [...$matches].forEach(($match, i) => {
              const $games = $match.querySelectorAll('[aria-label="liveticker-game-container"]');

              expect($games.length).to.be.above(0);
              [...$games].forEach(($game, j) => {
                expect($game).to.have.attribute('data-url');
                expect($game.getAttribute('data-url'))
                  .to.equal(results[0].snippet.extra.matches[i].matches[j].live_url);
              });
            });
          });

          it('with correct host', async function () {
            const $matches = await getElements({
              elementSelector: matchesSelector,
              url: cardsUrl,
            });

            expect($matches).to.have.length(daysNumber);
            [...$matches].forEach(($match, i) => {
              const $games = $match.querySelectorAll('[aria-label="liveticker-game-container"]');

              expect($games.length).to.be.above(0);
              [...$games].forEach(($game, j) => {
                expect($game.querySelector('[aria-label="liveticker-game-host"]')).to.exist;
                expect($game.querySelector('[aria-label="liveticker-game-host"]'))
                  .to.have.text(results[0].snippet.extra.matches[i].matches[j].HOST);
              });
            });
          });

          it('with correct score and date', async function () {
            const $matches = await getElements({
              elementSelector: matchesSelector,
              url: cardsUrl,
            });

            expect($matches).to.have.length(daysNumber);
            [...$matches].forEach(($match, i) => {
              const $games = $match.querySelectorAll('[aria-label="liveticker-game-container"]');

              expect($games.length).to.be.above(0);
              [...$games].forEach(($game, j) => {
                expect($game.querySelector('[aria-label="liveticker-game-score-date"]')).to.exist;
                expect($game.querySelector('[aria-label="liveticker-game-score-date"]'))
                  .to.have.text(
                    `${results[0].snippet.extra.matches[i].matches[j].scored} (${results[0].snippet.extra.matches[i].matches[j].gameTime})`
                  );
              });
            });
          });

          it('with correct guess', async function () {
            const $matches = await getElements({
              elementSelector: matchesSelector,
              url: cardsUrl,
            });

            expect($matches).to.have.length(daysNumber);
            [...$matches].forEach(($match, i) => {
              const $games = $match.querySelectorAll('[aria-label="liveticker-game-container"]');

              expect($games.length).to.be.above(0);
              [...$games].forEach(($game, j) => {
                expect($game.querySelector('[aria-label="liveticker-game-guess"]')).to.exist;
                expect($game.querySelector('[aria-label="liveticker-game-guess"]'))
                  .to.have.text(results[0].snippet.extra.matches[i].matches[j].GUESS);
              });
            });
          });
        });
      });
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
