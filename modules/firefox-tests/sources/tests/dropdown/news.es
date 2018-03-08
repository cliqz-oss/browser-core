/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsNews';

export default function () {
  context('for a news rich header', function () {
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('bild');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a parent news result', function () {
      it('successfully', function () {
        const parentNewsSelector = 'a.result';
        expect($resultElement.querySelector(parentNewsSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const parentNewsTitleSelector = 'a.result div.abstract p span.title';
        expect($resultElement.querySelector(parentNewsTitleSelector)).to.exist;
        expect($resultElement.querySelector(parentNewsTitleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const parentNewsDomainSelector = 'a.result div.abstract p span.url';
        expect($resultElement.querySelector(parentNewsDomainSelector)).to.exist;
        expect($resultElement.querySelector(parentNewsDomainSelector))
          .to.have.text(results[0].snippet.extra.domain);
      });

      it('with existing and correct link', function () {
        const parentNewsLinkSelector = 'a.result';
        expect($resultElement.querySelector(parentNewsLinkSelector).href).to.exist;
        expect($resultElement.querySelector(parentNewsLinkSelector).href)
          .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const parentNewsDescriptionSelector = 'a.result div.abstract p span.description';
        expect($resultElement.querySelector(parentNewsDescriptionSelector)).to.exist;
        expect($resultElement.querySelector(parentNewsDescriptionSelector))
          .to.have.text(results[0].snippet.description);
      });

      it('with 3 children', function () {
        const parentNewsChildrenSelector = 'div.news a.result';
        expect($resultElement.querySelectorAll(parentNewsChildrenSelector).length).to.equal(3);
      });
    });

    describe('renders all child news results', function () {
      it('successfully', function () {
        const childNewsSelector = 'div.news a.result';
        const childNewsItems = $resultElement.querySelectorAll(childNewsSelector);
        [].forEach.call(childNewsItems, function (child) {
          expect(child).to.exist;
        });
      });

      it('with existing and correct images', function () {
        const childImageSelector = 'div.news a.result div.abstract div.thumbnail img';
        const childrenImageItems = $resultElement.querySelectorAll(childImageSelector);
        [].forEach.call(childrenImageItems, function (image, i) {
          expect(image).to.exist;
          expect(image.src).to.equal(results[0].snippet.deepResults[0].links[i].extra.media);
        });
      });

      it('with existing and correct titles', function () {
        const childTitleSelector = 'div.news a.result div.abstract span.title';
        const childrenTitleItems = $resultElement.querySelectorAll(childTitleSelector);
        [].forEach.call(childrenTitleItems, function (title, i) {
          expect(title).to.exist;
          expect(title).to.have.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with existing and correct domains', function () {
        const childDomainSelector = 'div.news a.result div.abstract span.url';
        const childrenDomainItems = $resultElement.querySelectorAll(childDomainSelector);
        [].forEach.call(childrenDomainItems, function (domain, i) {
          expect(domain).to.exist;
          expect(domain).to.have.text(results[0].snippet.deepResults[0].links[i].extra.domain);
        });
      });

      it('with existing and correct links', function () {
        const childLinkSelector = 'div.news a.result';
        const childrenLinkItems = $resultElement.querySelectorAll(childLinkSelector);
        [].forEach.call(childrenLinkItems, function (link, i) {
          expect(link.href).to.exist;
          expect(link.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });

      it('with existing ages', function () {
        const childAgeSelector = 'div.news a.result div.abstract span.published-at';
        const childrenAgeItems = $resultElement.querySelectorAll(childAgeSelector);
        [].forEach.call(childrenAgeItems, function (age) {
          expect(age).to.exist;
        });
      });

      it('with existing and correct descriptions', function () {
        const childDescriptionSelector = 'div.news a.result div.abstract span.description';
        const childrenDescriptionItems = $resultElement.querySelectorAll(childDescriptionSelector);
        [].forEach.call(childrenDescriptionItems, function (desc, i) {
          expect(desc).to.exist;
          expect(desc).to.have.text(results[0]
            .snippet.deepResults[0].links[i].extra.description);
        });
      });
    });

    describe('renders buttons', function () {
      it('successfully', function () {
        const buttonsAreaSelector = 'div.buttons';
        expect($resultElement.querySelector(buttonsAreaSelector)).to.exist;
      });

      it('correct amount', function () {
        const buttonSelector = 'div.buttons a.btn';
        const amountOfButtons = results[0].snippet.deepResults[1].links.length;
        expect($resultElement.querySelectorAll(buttonSelector).length)
          .to.equal(amountOfButtons);
      });

      it('with correct text', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = $resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          expect(button).to.contain.text(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('with correct links', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = $resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          expect(button.href).to.contain(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });
  });
}
