import {
  expect,
  newTab,
  closeTab,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  checkComplementarySearchCard,
  checkTapMessage,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a calculator mobile cards result', function () {
    const query = '2 + 2';
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results: [] });
      win.CLIQZ.app.modules.search.action('startSearch', query, { tab: { id } });
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

    it('renders correct result', async function () {
      const $titles = await getElements({
        elementSelector: '[aria-label="calc-answer"]',
        url: cardsUrl,
      });

      expect($titles).to.have.length(1);
      expect($titles[0].textContent).to.equal('= 4');
    });

    it('renders correct expression', async function () {
      const $expressions = await getElements({
        elementSelector: '[aria-label="calc-expression"]',
        url: cardsUrl,
      });

      expect($expressions).to.have.length(1);
      expect($expressions[0].textContent).to.equal('2+2');
    });

    checkTapMessage({ url: cardsUrl });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
