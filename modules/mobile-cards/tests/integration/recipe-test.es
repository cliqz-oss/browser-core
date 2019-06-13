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
} from './helpers';

import { getMessage } from '../../../core/i18n';

import results from '../../../tests/core/integration/fixtures/mobile/resultsRecipe';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a recipe mobile cards result', function () {
    let id;
    const expandViewSelector = '[aria-label="expand-view-container"]';
    const ratingSelector = '[aria-label="rating"]';
    const recipeSelector = '[aria-label="recipe"]';
    const timeSelector = '[aria-label="recipe-cooking-time"]';

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'allrecipes beef', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, imageName: 'allrecipes' });

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

    context('recipe area', function () {
      it('is rendered', async function () {
        const $recipes = await getElements({
          elementSelector: recipeSelector,
          url: cardsUrl,
        });

        expect($recipes).to.have.length(1);
      });

      it('with correct rating', async function () {
        const $recipes = await getElements({
          elementSelector: recipeSelector,
          url: cardsUrl,
        });

        expect($recipes[0].querySelector(ratingSelector)).to.exist;

        const $rating = $recipes[0].querySelector(ratingSelector);

        expect($rating.querySelector('img').src).to.exist;
        expect($rating.querySelector('img').src)
          .to.equal(`http://cdn.cliqz.com/extension/EZ/richresult/stars${Math.round(results[0].snippet.extra.rich_data.rating)}.svg`);
      });

      it('with correct time', async function () {
        const $recipes = await getElements({
          elementSelector: recipeSelector,
          url: cardsUrl,
        });

        expect($recipes[0].querySelector(timeSelector)).to.exist;
        expect($recipes[0].querySelector(timeSelector))
          .to.have.text(getMessage('cook_time', results[0].snippet.extra.rich_data.cook_time));
      });
    });

    context('details area', function () {
      it('renders details', async function () {
        const $details = await getElements({
          elementSelector: expandViewSelector,
          url: cardsUrl,
        });

        expect($details).to.have.length(1);
      });

      it('with correct header', async function () {
        const $details = await getElements({
          elementSelector: expandViewSelector,
          url: cardsUrl,
        });

        expect($details[0].querySelector('[aria-label="expand-view-header"]')).to.exist;
        expect($details[0].querySelector('[aria-label="expand-view-header"]'))
          .to.have.text(getMessage('instruction'));
      });

      it('with the arrow', async function () {
        const $details = await getElements({
          elementSelector: expandViewSelector,
          url: cardsUrl,
        });

        const $arrow = $details[0].querySelector('[aria-label="expand-view-arrow"] img');

        expect($arrow.src).to.exist;
        expect($arrow.src).to.contain('/img/arrow-down.svg');
      });

      it('doesn\'t render content', async function () {
        const $details = await getElements({
          elementSelector: expandViewSelector,
          url: cardsUrl,
        });

        expect($details[0].querySelector('[aria-label="recipe-instructions"]')).to.not.exist;
      });
    });

    checkComplementarySearchCard({ url: cardsUrl });
  });
}
