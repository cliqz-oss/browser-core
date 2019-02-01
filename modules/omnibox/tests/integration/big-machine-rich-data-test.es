import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  checkParent,
  expect,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsBigMachineRichData';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';
  const imagesAreaSelector = '.images.padded';
  const resultSelector = 'a.result';
  const simpleLinksAreaSelector = '.anchors.padded';

  context('big machine result with rich data', async function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('github');
      await waitForPopup(1);
    });

    after(async function () {
      await blurUrlBar();
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults });
    checkParent({ $result: $cliqzResults, results });

    context('renders image area', function () {
      it('successfully', async function () {
        const $imagesArea = await $cliqzResults.querySelector(`${mainResultSelector} ${imagesAreaSelector}`);
        expect($imagesArea).to.exist;
      });

      it('with correct amount of images', async function () {
        const $allImages = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${imagesAreaSelector} ${resultSelector}`);
        const amountOfImages = (results[0].snippet.deepResults[0].links).length;

        if (amountOfImages <= 4) {
          expect($allImages.length).to.equal(amountOfImages);
        } else {
          expect($allImages.length).to.equal(4);
        }
      });

      context('each image', function () {
        it('renders from correct source', async function () {
          const $allImages = await $cliqzResults
            .querySelectorAll(`${mainResultSelector} ${imagesAreaSelector} ${resultSelector}`);

          expect($allImages.length).to.be.above(0);
          [...$allImages].forEach(async function ($image, i) {
            expect(await $image.querySelector('img').src)
              .to.be.equal(results[0].snippet.deepResults[0].links[i].image);
          });
        });

        it('renders with correct URL', async function () {
          const $allImages = await $cliqzResults
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
      it('successfully', async function () {
        const $imagesArea = await $cliqzResults.querySelector(`${mainResultSelector} ${simpleLinksAreaSelector}`);
        expect($imagesArea).to.exist;
      });

      it('with correct amount of elements', async function () {
        const $allLinks = await $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);
        const amountOfSimpleLinks = (results[0].snippet.deepResults[1].links).length;

        if (amountOfSimpleLinks <= 4) {
          expect($allLinks.length).to.equal(amountOfSimpleLinks);
        } else {
          expect($allLinks.length).to.equal(4);
        }
      });

      describe('each simple link', function () {
        it('renders with correct title', async function () {
          const $allLinks = await $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);

          expect($allLinks.length).to.be.above(0);
          [...$allLinks].forEach(function ($link, i) {
            expect($link.title).to.be.equal(results[0].snippet.deepResults[1].links[i].title);
          });
        });

        it('renders with correct URL', async function () {
          const $allLinks = await $cliqzResults.querySelectorAll(`${mainResultSelector} ${simpleLinksAreaSelector} ${resultSelector}`);

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
