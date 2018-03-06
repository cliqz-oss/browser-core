import {
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsBigMachineRichData';

export default function () {
  context('big machine result with rich data', function () {
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('github');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    describe('renders result', function () {
      it('with correct title', function () {
        const titleSelector = ".abstract span[data-extra='title']";
        expect($resultElement).to.contain(titleSelector);
        expect($resultElement.querySelector(titleSelector)).to.have.text(results[0].snippet.title);
      });

      it('with correct description', function () {
        const descriptionSelector = ".abstract span[class='description']";
        expect($resultElement).to.contain(descriptionSelector);
        expect($resultElement.querySelector(descriptionSelector))
          .to.have.text(results[0].snippet.description);
      });

      it('with correct url', function () {
        const urlSelector = ".abstract span[class='url']";
        expect($resultElement).to.contain(urlSelector);
        expect($resultElement.querySelectorAll(urlSelector)[1]).to.have.text(results[0].url);
      });

      it('with logo', function () {
        const logoSelector = ".icons span[class='logo']";
        expect($resultElement).to.contain(logoSelector);
      });
    });

    describe('renders images', function () {
      it('successfully', function () {
        const imagesAreaSelector = '.images.padded';
        expect($resultElement.querySelector(imagesAreaSelector)).to.exist;
      });

      it('correct amount of images', function () {
        const imagesSelector = '.images.padded a.result';
        const amountOfImages = (results[0].snippet.deepResults[0].links).length;
        if (amountOfImages <= 4) {
          expect($resultElement.querySelectorAll(imagesSelector).length).to.equal(amountOfImages);
        } else {
          expect($resultElement.querySelectorAll(imagesSelector).length).to.equal(4);
        }
      });

      it('correct images', function () {
        const imagesSelector = '.images.padded a.result img';
        const imagesItems = $resultElement.querySelectorAll(imagesSelector);
        [].forEach.call(imagesItems, function (image, i) {
          expect(image.src).to.be.equal(results[0].snippet.deepResults[0].links[i].image);
        });
      });

      it('correct links', function () {
        const imagesSelector = '.images.padded a.result';
        const imagesItems = $resultElement.querySelectorAll(imagesSelector);
        [].forEach.call(imagesItems, function (image, i) {
          expect(image.dataset.url).to.be.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders simple links', function () {
      it('successfully', function () {
        const linksAreaSelector = '.anchors.padded';
        expect($resultElement.querySelector(linksAreaSelector)).to.exist;
      });

      it('correct amount of links', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const amountOfSimpleLinks = (results[0].snippet.deepResults[1].links).length;
        if (amountOfSimpleLinks <= 4) {
          expect($resultElement.querySelectorAll(simpleLinksSelector).length)
            .to.equal(amountOfSimpleLinks);
        } else {
          expect($resultElement.querySelectorAll(simpleLinksSelector).length).to.equal(4);
        }
      });

      it('with correct titles', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const simpleLinksItems = $resultElement.querySelectorAll(simpleLinksSelector);
        [].forEach.call(simpleLinksItems, function (link, i) {
          expect(link.title).to.be.equal(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('with correct urls', function () {
        const simpleLinksSelector = '.anchors.padded a.result';
        const simpleLinksItems = $resultElement.querySelectorAll(simpleLinksSelector);
        [].forEach.call(simpleLinksItems, function (link, i) {
          expect(link.dataset.url).to.be.equal(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });
  });
}
