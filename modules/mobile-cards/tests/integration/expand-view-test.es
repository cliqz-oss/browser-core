import {
  click,
  closeTab,
  expect,
  newTab,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import resultsRecipe from '../../../tests/core/integration/fixtures/mobile/resultsRecipe';
import {
  notLocalResults,
} from '../../../tests/core/integration/fixtures/resultsCinema';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('expand view for recipe', function () {
    let id;
    const results = resultsRecipe;
    const contentSelector = '[aria-label="expand-view-content"]';
    const expandSelector = '[aria-label="expand-view-container"] [role="presentation"]';

    beforeEach(async function () {
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

    afterEach(async function () {
      await closeTab(id);
      win.CLIQZ.app.modules.search.action('stopSearch');
    });

    it('instructions are not rendered', async function () {
      const $content = await getElements({
        elementSelector: contentSelector,
        url: cardsUrl,
      });

      expect($content).to.have.length(0);
    });

    context('click on instructions to expand', function () {
      beforeEach(async function () {
        await click(cardsUrl, expandSelector);
      });

      it('renders content', async function () {
        const instructionsText = `${results[0].snippet.extra.rich_data.mobi.instruction[0]}${results[0].snippet.extra.rich_data.mobi.instruction[1]}`;
        const $content = await getElements({
          elementSelector: contentSelector,
          url: cardsUrl,
        });

        expect($content).to.have.length(1);
        expect($content[0]).to.have.text(instructionsText);
      });

      context('click on instructions again', function () {
        beforeEach(async function () {
          await click(cardsUrl, expandSelector);
        });

        it('doesn\'t render content', async function () {
          const $content = await getElements({
            elementSelector: contentSelector,
            url: cardsUrl,
          });

          expect($content).to.have.length(0);
        });
      });
    });
  });

  describe('expand view for cinema', function () {
    let id;
    const results = notLocalResults;
    const contentSelector = '[aria-label="expand-view-content"]';
    const containerSelector = '[aria-label="expand-view-container"]';
    const expandSelector = '[aria-label="expand-view-container"] [role="presentation"]';
    const showtimeSelector = '[aria-label="movie-showtime-link"]';
    const movieList = results[0].snippet.extra.data.showdates[0].movie_list;

    beforeEach(async function () {
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

    afterEach(async function () {
      await closeTab(id);
      win.CLIQZ.app.modules.search.action('stopSearch');
    });

    it('renders correct number of movies', async function () {
      const $movies = await getElements({
        elementSelector: containerSelector,
        url: cardsUrl,
      });

      expect($movies).to.have.length(results[0].snippet.extra.data.showdates[0].movie_list.length);
    });

    it('showtimes are not rendered', async function () {
      const $content = await getElements({
        elementSelector: contentSelector,
        url: cardsUrl,
      });

      expect($content).to.have.length(0);
    });

    movieList.forEach(async function (movie, i) {
      context(`click on movie "${movie.title}" to expand`, function () {
        beforeEach(async function () {
          await click(cardsUrl, expandSelector, i);
        });

        it('renders correct showtimes', async function () {
          const $containers = await getElements({
            elementSelector: containerSelector,
            url: cardsUrl,
          });

          expect($containers[i].querySelector(contentSelector)).to.exist;
          const $content = $containers[i].querySelector(contentSelector);
          const $showtimes = $content.querySelectorAll(showtimeSelector);
          const showtimesData = results[0].snippet.extra.data.showdates[0].movie_list[i].showtimes;

          expect($showtimes).to.have.length(showtimesData.length);
          [...$showtimes].forEach(function ($showtime, j) {
            expect($showtime).to.exist;
            expect($showtime).to.have.attribute('data-url');
            expect($showtime.getAttribute('data-url')).to.equal(showtimesData[j].booking_link);
            expect($showtime).to.have.text(showtimesData[j].start_at.substr(11, 5));
          });
        });

        context('click again', function () {
          beforeEach(async function () {
            await click(cardsUrl, expandSelector, i);
          });

          it('doesn\'t render showtimes', async function () {
            const $content = await getElements({
              elementSelector: contentSelector,
              url: cardsUrl,
            });

            expect($content).to.have.length(0);
          });
        });
      });
    });
  });
}
