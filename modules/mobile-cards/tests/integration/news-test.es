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

import results from '../../../tests/core/integration/fixtures/resultsNews';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a news mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'bild', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'bild' });

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

    it('renders correct number of news elements', async function () {
      const $news = await getElements({
        elementSelector: '[aria-label="news-item"]',
        url: cardsUrl,
      });
      expect($news).to.have.length(3);
    });

    context('each news element', function () {
      it('renders with correct image', async function () {
        const $images = await getElements({
          elementSelector: '[aria-label="news-image"] img',
          url: cardsUrl,
        });

        expect($images).to.have.length(3);
        [...$images].forEach(($image, i) => {
          expect($image.src).to.exist;
          expect($image.src)
            .to.contain(results[0].snippet.deepResults[1].links[i].extra.thumbnail);
        });
      });

      it('renders with correct title', async function () {
        const $newsTitles = await getElements({
          elementSelector: '[aria-label="news-title"]',
          url: cardsUrl,
        });

        expect($newsTitles).to.have.length(3);
        [...$newsTitles].forEach(($title, i) => {
          expect($title.textContent).to.contain(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('renders with an existing timestamp', async function () {
        const $newsTimestamp = await getElements({
          elementSelector: '[aria-label="news-timestamp"]',
          url: cardsUrl,
        });
        expect($newsTimestamp).to.have.length(3);
      });

      it('renders with correct url', async function () {
        const $news = await getElements({
          elementSelector: '[aria-label="news-item"]',
          url: cardsUrl,
        });

        expect($news).to.have.length(3);
        [...$news].forEach((n, i) => {
          expect(n.dataset.url).to.exist;
          expect(n.dataset.url)
            .to.equal(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
