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

import results from '../../../tests/core/integration/fixtures/resultsBigMachineWithButtons';
import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a big machine with buttons mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'bing', { tab: { id } });
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
    checkHeader({ url: cardsUrl, results, isDefault: false, imageName: 'bing' });

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

    checkButtons({ url: cardsUrl, results, numberButtons: 3 });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
