import {
  closeTab,
  expect,
  getResourceUrl,
  newTab,
  queryHTML,
  waitForAsync
} from '../../../tests/core/test-helpers';
import { isFirefox } from '../../../core/platform';

export default function () {
  const url = getResourceUrl('freshtab', 'home.html');

  // Currently queryHTML from core/background will only work in firefox.
  if (!isFirefox) {
    return;
  }

  context('Freshtab', function () {
    describe('opened in a new tab', function () {
      let tabId;

      beforeEach(async function () {
        // Load freshtab in new tab
        tabId = await newTab(url, false);

        // wait for favorites header in freshtab to be loaded
        // as a sign all elements are there
        await waitForAsync(
          () => queryHTML(url, '#section-favorites .dial-header', 'innerText')
        );
      });

      afterEach(async () => {
        if (tabId !== null) {
          await closeTab(tabId);
        }
      });

      it('renders successfully', async () => {
        const $favHeader = await queryHTML(url, '#section-favorites .dial-header', 'innerText');
        expect($favHeader).to.have.length(1);
        expect($favHeader[0]).to.equal('Favorites');

        const $search = await queryHTML(url, '.search', 'nodeName');
        expect($search).to.have.length(1);

        const $news = await queryHTML(url, '.news', 'nodeName');
        expect($news).to.have.length(1);
      });
    });
  });
}
