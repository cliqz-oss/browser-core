import { newTab } from '../../../platform/browser';
import {
  app,
  expect,
  waitForAsync
} from '../../../firefox-tests/tests/dropdown/helpers';

const queryHTML = async (url, selector, property) => {
  const response = await app.modules.core.action('queryHTML', url, selector, property);
  return response;
};

export default function () {
  const url = 'resource://cliqz/freshtab/home.html';

  context('Freshtab', function () {
    describe('opened in a new tab', function () {
      beforeEach(async function () {
        // open new tab
        await newTab(url, false);

        // wait for favorites header in freshtab to be loaded
        // as a sign all elements are there
        await waitForAsync(
          () => queryHTML(url, '#section-favorites .dial-header', 'innerText')
        );
      });

      it('renders successfully', async function () {
        const $favHeader = await queryHTML(url, '#section-favorites .dial-header', 'innerText');
        expect($favHeader.length).to.equal(1);
        expect($favHeader[0]).to.equal('Favorites');

        const $search = await queryHTML(url, '.search', 'nodeName');
        expect($search.length).to.equal(1);

        const $news = await queryHTML(url, '.news', 'nodeName');
        expect($news.length).to.equal(1);
      });
    });
  });
}
