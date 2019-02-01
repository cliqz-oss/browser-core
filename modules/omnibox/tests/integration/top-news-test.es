import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getComputedStyle,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

import results from '../../core/integration/fixtures/resultsTopNews';

export default function () {
  context('for top news', function () {
    const mainResultSelector = '.cliqz-result:not(.history)';
    const headerSelector = '.top-news-header';
    const resultSelector = '.news-story a.result';
    const newsSelector = '.abstract';
    const logoSelector = '.icons .logo';
    const thumbnailSelector = '.thumbnail img';
    const titleSelector = '.title';
    const descriptionSelector = '.description';
    const breakingSelector = '.breaking-news';
    const timestampSelector = '.published-at';
    const domainSelector = '.url';

    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('top news');
      await waitForPopup(1, 2000);
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('renders news table', function () {
      it('successfully', async function () {
        const $newsResult = await $cliqzResults.querySelector(mainResultSelector);
        expect($newsResult).to.exist;
      });

      it('with a correct header', async function () {
        const $header = await $cliqzResults
          .querySelector(`${mainResultSelector} ${headerSelector}`);

        expect($header).to.exist;
        expect($header).to.contain.text(results[0].snippet.extra.locale_title);
      });
    });


    context('renders all children results', function () {
      it('with a correct number of news', async function () {
        const $newsElement = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector}`);

        expect($newsElement).to.have.length(3);
      });

      it('with correct thumbnail', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childThumbnail = $child.querySelector(thumbnailSelector);

          expect($childThumbnail).to.exist;
          expect($childThumbnail.src)
            .to.equal(results[0].snippet.deepResults[0].links[i].extra.media);
        });
      });

      it('with a correct title', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childTitle = $child.querySelector(titleSelector);

          expect($childTitle).to.exist;
          expect($childTitle)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.short_title);
        });
      });

      it('with a correct description', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childDescription = $child.querySelector(descriptionSelector);

          expect($childDescription).to.exist;
          expect($childDescription)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.description);
        });
      });

      it('with a correct URL', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          expect($child.href).to.exist;
          expect($child.href)
            .to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });

      it('with an existing timestamp', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child) {
          const $childTimestamp = $child.querySelector(timestampSelector);

          expect($childTimestamp).to.exist;
        });
      });

      it('with a correct domain', async function () {
        const $allChildrenElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childDomain = $child.querySelector(domainSelector);

          expect($childDomain).to.exist;
          expect($childDomain)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.domain);
        });
      });

      it('with an existing breaking news label', async function () {
        const $breakingNews = await $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${breakingSelector}`);

        expect($breakingNews).to.exist;
      });
    });

    context('renders logos for children results', function () {
      it('with correct logos', async function () {
        const $allLogosElements = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${logoSelector}`);

        expect($allLogosElements).to.have.length(3);

        expect(await getComputedStyle($allLogosElements[0], 'backgroundImage')).to.contain('abcnews');

        expect(await getComputedStyle($allLogosElements[1], 'backgroundImage')).to.contain('nbcnews');

        expect(await getComputedStyle($allLogosElements[2], 'backgroundImage')).to.contain('cbsnews');
      });
    });
  });
}
