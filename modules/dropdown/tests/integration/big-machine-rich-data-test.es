import {
  blurUrlBar,
  checkMainResult,
  checkParent,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsBigMachineRichData';

export default function () {
  if (!testsEnabled()) { return; }

  const mainResultSelector = '.cliqz-result:not(.history)';
  const imagesAreaSelector = '.images.padded';
  const resultSelector = 'a.result';
  const simpleLinksAreaSelector = '.anchors.padded';

  context('big machine result with rich data', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('github');
      await waitForPopup(2);
    });

    after(function () {
      blurUrlBar();
      window.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });

    context('renders image area', function () {
      it('successfully', function () {
        const $imagesArea = $cliqzResults.querySelector(`${mainResultSelector} ${imagesAreaSelector}`);
        expect($imagesArea).to.exist;
      });

      it('with correct amount of images', function () {
        const $allImages = $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${imagesAreaSelector} ${resultSelector}`);
        const amountOfImages = (results[0].snippet.deepResults[0].links).length;

        if (amountOfImages <= 4) {
          expect($allImages.length).to.equal(amountOfImages);
        } else {
          expect($allImages.length).to.equal(4);
        }
      });

      context('each image', function () {
        it('renders from correct source', function () {
          const $allImages = $cliqzResults
            .querySelectorAll(`${mainResultSelector} ${imagesAreaSelector} ${resultSelector}`);

          expect($allImages.length).to.be.above(0);
          [...$allImages].forEach(function ($image, i) {
            expect($image.querySelector('img').src)
              .to.be.equal(results[0].snippet.deepResults[0].links[i].image);
          });
        });

        it('renders with correct URL', function () {
          const $allImages = $cliqzResults
            .querySelectorAll(`${mainResultSelector} ${imagesAreaSelector} ${resultSelector}`);

          expect($allImages.length).to.be.above(0);
          [...$allImages].forEach(function ($image, i) {
            expect($image.href).to.exist;
            expect($image.href).to.be.equal(results[0].snippet.deepResults[0].links[i].url);
          });
        });
      });
    });

    context('renders simple links area', function () {
      it('successfully', function () {
        const $imagesArea = $cliqzResults.querySelector(`${mainResultSelector} ${simpleLinksAreaSelector}`);
        expect($imagesArea).to.exist;
      });

      it('with correct amount of elements', function () {
        const $allLinks = $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);
        const amountOfSimpleLinks = (results[0].snippet.deepResults[1].links).length;

        if (amountOfSimpleLinks <= 4) {
          expect($allLinks.length).to.equal(amountOfSimpleLinks);
        } else {
          expect($allLinks.length).to.equal(4);
        }
      });

      describe('each simple link', function () {
        it('renders with correct title', function () {
          const $allLinks = $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);

          expect($allLinks.length).to.be.above(0);
          [...$allLinks].forEach(function ($link, i) {
            expect($link.title).to.be.equal(results[0].snippet.deepResults[1].links[i].title);
          });
        });

        it('renders with correct URL', function () {
          const $allLinks = $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);

          expect($allLinks.length).to.be.above(0);
          [...$allLinks].forEach(function ($link, i) {
            expect($link.href).to.exist;
            expect($link.href).to.be.equal(results[0].snippet.deepResults[1].links[i].url);
          });
        });
      });
    });
  });
}
