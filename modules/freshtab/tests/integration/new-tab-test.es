import {
  expect,
  newTab,
  queryHTML,
  waitForAsync,
  waitForElement,
} from '../../../tests/core/test-helpers';
import {
  getResourceUrl,
} from '../../../tests/core/integration/helpers';
import { isBootstrap } from '../../../core/platform';

export default function () {
  const url = getResourceUrl('freshtab/home.html');

  // Currently queryHTML from core/background will only work in firefox.
  if (!isBootstrap) {
    return;
  }

  context('Freshtab', function () {
    describe('opened in a new tab', function () {
      beforeEach(async function () {
        // Load freshtab in new tab
        await newTab(url, { focus: true });
        await waitForElement({ url, selector: '#section-favorites .dial-header' });
      });

      it('renders successfully', async () => {
        const $favHeader = await queryHTML(url, '#section-favorites .dial-header', 'innerText');
        expect($favHeader).to.have.length(1);
        expect($favHeader[0]).to.equal('Favorites');

        await waitForAsync(async () => {
          const $search = await queryHTML(url, '.search', 'nodeName');
          return expect($search).to.have.length(1);
        });

        await waitForAsync(async () => {
          const $news = await queryHTML(url, '.news', 'nodeName');
          return expect($news).to.have.length(1);
        });
      });
    });
  });
}
