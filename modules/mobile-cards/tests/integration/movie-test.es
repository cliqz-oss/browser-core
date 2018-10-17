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
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import results from '../../../tests/core/integration/fixtures/resultsMovie';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a movie mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'imdb the circle', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'imdb' });

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

    it('renders correct poster', async function () {
      await waitFor(async () => {
        const $posters = await getElements({
          elementSelector: '[aria-label="main-image"] img',
          url: cardsUrl,
        });

        expect($posters).to.have.length(1);
        expect($posters[0].src).to.exist;
        return expect($posters[0].src).to.equal(results[0].snippet.extra.og.image);
      }, 10000);
    });

    it('renders correct rating', async function () {
      const $raitings = await getElements({
        elementSelector: '[aria-label="movie-rating"] img',
        url: cardsUrl,
      });

      expect($raitings).to.have.length(1);
      expect($raitings[0].src).to.exist;
      expect($raitings[0].src).to.equal(results[0].snippet.extra.rich_data.rating.img);
    });

    it('renders correct director info with correct url', async function () {
      const $directors = await getElements({
        elementSelector: '[aria-label="director-link"]',
        url: cardsUrl,
      });

      expect($directors).to.have.length(1);
      expect($directors[0].textContent)
        .to.contain(results[0].snippet.extra.rich_data.director.title);
      expect($directors[0].textContent)
        .to.contain(results[0].snippet.extra.rich_data.director.info.name);

      expect($directors[0].dataset.url).to.exist;
      expect($directors[0].dataset.url)
        .to.equal(results[0].snippet.extra.rich_data.director.info.url);
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
