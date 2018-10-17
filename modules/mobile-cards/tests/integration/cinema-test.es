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
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import {
  notLocalResults,
} from '../../../tests/core/integration/fixtures/resultsCinema';

import { getMessage } from '../../../core/i18n';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a cinema mobile cards result', function () {
    let id;
    const results = notLocalResults;
    const moviesNumber = results[0].snippet.extra.data.showdates[0].movie_list.length;
    const expandViewSelector = '[aria-label="expand-view-container"]';

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'test', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, isDefault: true, imageName: 'yo' });

    it('renders title', async function () {
      const $titles = await getElements({
        elementSelector: '[aria-label="generic-title"]',
        url: cardsUrl,
      });

      expect($titles).to.have.length(1);
      expect($titles[0].textContent).to.equal(results[0].snippet.title);
    });

    it('renders description', async function () {
      const $descriptions = await getElements({
        elementSelector: '[aria-label="generic-desc"]',
        url: cardsUrl,
      });

      expect($descriptions).to.have.length(1);
      expect($descriptions[0].textContent).to.equal(results[0].snippet.description);
    });

    context('cinema area', function () {
      it('is rendered', async function () {
        const $cinemas = await getElements({
          elementSelector: '[aria-label="cinema"]',
          url: cardsUrl,
        });

        expect($cinemas).to.have.length(1);
      });

      it('with showtime', async function () {
        const $showTimes = await getElements({
          elementSelector: '[aria-label="cinema-showtimes"]',
          url: cardsUrl,
        });

        expect($showTimes).to.have.length(1);
        expect($showTimes[0]).to.have.text(`${getMessage('cinema_movie_showtimes')}: ${results[0].snippet.extra.data.showdates[0].date.toUpperCase()}`);
      });

      it('with correct amount of movies', async function () {
        const $movies = await getElements({
          elementSelector: expandViewSelector,
          url: cardsUrl,
        });

        expect($movies).to.have.length(moviesNumber);
      });

      context('for each movie', function () {
        it('renders name', async function () {
          const $movies = await getElements({
            elementSelector: expandViewSelector,
            url: cardsUrl,
          });

          expect($movies).to.have.length(moviesNumber);
          [...$movies].forEach(($movie, ind) => {
            const $header = $movie.querySelector('[aria-label="expand-view-header"]');
            expect($header).to.exist;
            expect($header)
              .to.have.text(results[0].snippet.extra.data.showdates[0].movie_list[ind].title);
          });
        });

        it('renders arrow', async function () {
          const $movies = await getElements({
            elementSelector: expandViewSelector,
            url: cardsUrl,
          });

          expect($movies).to.have.length(moviesNumber);
          [...$movies].forEach(($movie) => {
            const $arrow = $movie.querySelector('[aria-label="expand-view-arrow"] img');
            expect($arrow.src).to.exist;
            expect($arrow.src).to.contain('/img/arrow-down.svg');
          });
        });

        it('doesn\'t render content', async function () {
          const $movies = await getElements({
            elementSelector: expandViewSelector,
            url: cardsUrl,
          });

          expect($movies).to.have.length(moviesNumber);
          [...$movies].forEach(($movie) => {
            expect($movie.querySelector('[aria-label="expand-view-content"]')).to.not.exist;
          });
        });
      });
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
