import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getComputedStyle,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

import results from '../../core/integration/fixtures/resultsTopNews';

export default function () {
  if (!testsEnabled()) { return; }

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
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('top news');
      await waitForPopup(2, 2000);
    });

    after(function () {
      win.preventRestarts = false;
    });

    describe('renders news table', function () {
      it('successfully', function () {
        const $newsResult = $cliqzResults.querySelector(mainResultSelector);
        expect($newsResult).to.exist;
      });

      it('with a correct header', function () {
        const $header = $cliqzResults
          .querySelector(`${mainResultSelector} ${headerSelector}`);

        expect($header).to.exist;
        expect($header).to.contain.text(results[0].snippet.extra.locale_title);
      });
    });


    context('renders all children results', function () {
      it('with a correct number of news', function () {
        const $newsElement = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector}`);

        expect($newsElement).to.have.length(3);
      });

      it('with correct thumbnail', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childThumbnail = $child.querySelector(thumbnailSelector);

          expect($childThumbnail).to.exist;
          expect($childThumbnail.src)
            .to.equal(results[0].snippet.deepResults[0].links[i].extra.media);
        });
      });

      it('with a correct title', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childTitle = $child.querySelector(titleSelector);

          expect($childTitle).to.exist;
          expect($childTitle)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.short_title);
        });
      });

      it('with a correct description', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childDescription = $child.querySelector(descriptionSelector);

          expect($childDescription).to.exist;
          expect($childDescription)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.description);
        });
      });

      it('with a correct URL', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          expect($child.href).to.exist;
          expect($child.href)
            .to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });

      it('with an existing timestamp', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child) {
          const $childTimestamp = $child.querySelector(timestampSelector);

          expect($childTimestamp).to.exist;
        });
      });

      it('with a correct domain', function () {
        const $allChildrenElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${newsSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childDomain = $child.querySelector(domainSelector);

          expect($childDomain).to.exist;
          expect($childDomain)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.domain);
        });
      });

      it('with an existing breaking news label', function () {
        const $breakingNews = $cliqzResults
          .querySelector(`${mainResultSelector} ${resultSelector} ${newsSelector} ${breakingSelector}`);

        expect($breakingNews).to.exist;
      });
    });

    context('renders logos for children results', function () {
      it('with correct logos', function () {
        const $allLogosElements = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${resultSelector} ${logoSelector}`);

        expect($allLogosElements).to.have.length(3);

        expect(getComputedStyle($allLogosElements[0]).backgroundImage).to.contain('abcnews');

        expect(getComputedStyle($allLogosElements[1]).backgroundImage).to.contain('nbcnews');

        expect(getComputedStyle($allLogosElements[2]).backgroundImage).to.contain('cbsnews');
      });
    });
  });
}
