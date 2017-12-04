/* global it, expect, respondWith, fillIn, waitForPopup, getComputedStyle,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-undef: 'off'*/

import results from './fixtures/resultsYoutube';

export default function () {
  context('for a Youtube rich header', function () {
    const youtubeChildrenSelector = 'div.videos a.result';
    let resultElement;
    let youtubeChildrenItems;

    before(function () {
      respondWith({ results });
      fillIn('youtube');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
        youtubeChildrenItems = resultElement.querySelectorAll(youtubeChildrenSelector);
      });
    });

    it('renders rich header result successfully', function () {
      chai.expect(resultElement).to.exist;
    });

    describe('renders parent element', function () {
      const youtubeParentSelector = 'a.result';
      let youtubeParentItem;

      before(function () {
        youtubeParentItem = resultElement.querySelector(youtubeParentSelector);
      });

      it('successfully', function () {
        chai.expect(youtubeParentItem).to.exist;
      });

      it('with existing and correct title', function () {
        const youtubeParentTitleSelector = 'div.abstract span.title';
        const youtubeParentTitleItem = youtubeParentItem.querySelector(youtubeParentTitleSelector);
        chai.expect(youtubeParentTitleItem).to.exist;
        chai.expect(youtubeParentTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const youtubeParentTitleSelector = 'div.abstract span.url';
        const youtubeParentTitleItem = youtubeParentItem.querySelector(youtubeParentTitleSelector);
        chai.expect(youtubeParentTitleItem).to.exist;
        chai.expect(youtubeParentTitleItem).to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const youtubeParentLogoSelector = 'div.icons span.logo';
        const youtubeParentLogoItem = youtubeParentItem.querySelector(youtubeParentLogoSelector);
        chai.expect(youtubeParentLogoItem).to.exist;
      });

      it('with a correct link', function () {
        chai.expect(youtubeParentItem.href).to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const youtubeParentDescSelector = 'div.abstract span.description';
        const youtubeParentDescItem = youtubeParentItem.querySelector(youtubeParentDescSelector);
        chai.expect(youtubeParentDescItem).to.exist;
        chai.expect(youtubeParentDescItem).to.have.text(results[0].snippet.description);
      });

      it('with 3 children', function () {
        chai.expect(youtubeChildrenItems.length).to.equal(3);
      });
    });

    describe('renders all child video results', function () {
      it('with existing and correct images', function () {
        const youtubeChildImageSelector = 'div.abstract div.thumbnail img ';

        if (youtubeChildrenItems.length > 0) {
          [...youtubeChildrenItems].forEach(function (child, i) {
            const youtubeChildImageItems = child.querySelector(youtubeChildImageSelector);
            chai.expect(youtubeChildImageItems).to.exist;
            chai.expect(youtubeChildImageItems.src)
              .to.equal(results[0].snippet.deepResults[0].links[i].extra.thumbnail);
          });
        } else {
          throw new Error('Youtube results have been generated without children elements.');
        }
      });

      it('with existing duration time', function () {
        const youtubeChildDurationSelector = 'div.abstract div.thumbnail span.duration';

        if (youtubeChildrenItems.length > 0) {
          [...youtubeChildrenItems].forEach(function (child) {
            const youtubeChildDurationItems = child.querySelector(youtubeChildDurationSelector);
            chai.expect(youtubeChildDurationItems).to.exist;
          });
        } else {
          throw new Error('Youtube results have been generated without children elements.');
        }
      });

      it('with existing and correct titles', function () {
        const youtubeChildTitleSelector = 'div.abstract div.content span.title';

        if (youtubeChildrenItems.length > 0) {
          [...youtubeChildrenItems].forEach(function (child, i) {
            const youtubeChildTitleItems = child.querySelector(youtubeChildTitleSelector);
            chai.expect(youtubeChildTitleItems).to.exist;
            chai.expect(youtubeChildTitleItems)
              .to.have.text(results[0].snippet.deepResults[0].links[i].title);
          });
        } else {
          throw new Error('Youtube results have been generated without children elements.');
        }
      });

      it('with existing and correct view count', function () {
        const youtubeChildCountSelector = 'div.abstract div.content span.video-views';

        if (youtubeChildrenItems.length > 0) {
          [...youtubeChildrenItems].forEach(function (child, i) {
            const youtubeChildCountItems = child.querySelector(youtubeChildCountSelector);
            chai.expect(youtubeChildCountItems).to.exist;
            chai.expect(youtubeChildCountItems)
              .to.contain.text(results[0].snippet.deepResults[0].links[i].extra.views);
          });
        } else {
          throw new Error('Youtube results have been generated without children elements.');
        }
      });

      it('with existing and correct links', function () {
        if (youtubeChildrenItems.length > 0) {
          [...youtubeChildrenItems].forEach(function (child, i) {
            chai.expect(child.href).to.exist;
            chai.expect(child.href)
              .to.contain(results[0].snippet.deepResults[0].links[i].url);
          });
        } else {
          throw new Error('Youtube results have been generated without children elements.');
        }
      });
    });

    describe('renders buttons', function () {
      const buttonSelector = 'div.buttons a.btn';
      let buttonsItems;
      let amountOfButtonsInResults;

      before(function () {
        buttonsItems = resultElement.querySelectorAll(buttonSelector);
        amountOfButtonsInResults = buttonsItems.length;
      });

      it('in correct amount', function () {
        const amountOfButtonsFromData = results[0].snippet.deepResults[1].links.length;
        chai.expect(amountOfButtonsInResults).to.equal(amountOfButtonsFromData);
      });

      it('with correct text', function () {
        if (amountOfButtonsInResults > 0) {
          [...buttonsItems].forEach(function (button, i) {
            chai.expect(button).to.contain.text(results[0].snippet.deepResults[1].links[i].title);
          });
        } else {
          throw new Error('Youtube results have been generated without buttons.');
        }
      });

      it('with correct links', function () {
        if (amountOfButtonsInResults > 0) {
          [...buttonsItems].forEach(function (button, i) {
            chai.expect(button.href)
              .to.contain(results[0].snippet.deepResults[1].links[i].url);
          });
        } else {
          throw new Error('Youtube results have been generated without buttons.');
        }
      });
    });
  });
}
