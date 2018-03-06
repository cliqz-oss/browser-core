import {
  app,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getLocaliseString,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsAdultQuestionIntegration';


export default function () {
  describe('adult question integration', function () {
    context('renders explicit content question', function () {
      let $resultElement;

      before(function () {
        CliqzUtils.setPref('adultContentFilter', 'moderate');
        withHistory([]);
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        });
      });

      it('renders question', function () {
        const questionSelector = '.result.adult-question';
        expect($resultElement).to.contain(questionSelector);
        const question = $resultElement.querySelector('.result.adult-question > .padded');
        const questionText = getLocaliseString({
          de: 'Websites mit nicht-jugendfreien Inhalten wurden automatisch geblockt. Weiterhin blockieren?',
          default: 'Websites with explicit content have been blocked automatically. Continue blocking?'
        });
        expect(question.textContent.trim()).to.be.equal(questionText);
      });

      it('renders buttons', function () {
        const buttonsArea = $resultElement.querySelector('.buttons');
        const showOnceText = getLocaliseString({
          de: 'Diesmal anzeigen',
          default: 'Show once'
        });
        const alwaysText = getLocaliseString({
          de: 'Immer',
          default: 'Always'
        });
        const neverText = getLocaliseString({
          de: 'Nie',
          default: 'Never',
        });
        const buttons = buttonsArea.querySelectorAll('.result');
        expect(buttonsArea).to.exist;
        expect(buttons[0].textContent.trim()).to.be.equal(showOnceText);
        expect(buttons[1].textContent.trim()).to.be.equal(alwaysText);
        expect(buttons[2].textContent.trim()).to.be.equal(neverText);
      });
    });

    context('click on "Show Once" button', function () {
      let $resultElement;
      let $resultElementNew;

      before(function () {
        CliqzUtils.setPref('adultContentFilter', 'moderate');
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        }).then(() => {
          app.modules.dropdown.getWindowModule(CliqzUtils.getWindow()).ui.dropdown.onMouseUp({
            originalTarget: $resultElement.querySelectorAll('.buttons .result')[0],
          });

          return waitForPopup().then(function () {
            $resultElementNew = $cliqzResults()[0];
          });
        });
      });

      it('result exists', function () {
        const resultSelector = '.result';
        expect($resultElementNew).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const logoSelector = '.result .icons .logo';
        expect($resultElementNew).to.contain(logoSelector);
      });

      it('renders title', function () {
        const titleSelector = '.result .abstract .title';
        expect($resultElementNew).to.contain(titleSelector);
        expect($resultElementNew.querySelector(titleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('renders divider', function () {
        const dividerSelector = '.result .abstract .divider';
        expect($resultElementNew).to.contain(dividerSelector);
        expect($resultElementNew.querySelector(dividerSelector)).to.have.text('—');
      });

      it('renders url', function () {
        const urlSelector = '.result .abstract .url';
        expect($resultElementNew).to.contain(urlSelector);
        expect($resultElementNew.querySelector(urlSelector)).to.have.text(results[0].url);
      });

      it('renders description', function () {
        const descriptionSelector = '.result .abstract .description';
        expect($resultElementNew).to.contain(descriptionSelector);
        expect($resultElementNew.querySelector(descriptionSelector))
          .to.have.text(results[0].snippet.description);
      });
    });

    context('click on "Always" button', function () {
      let $resultElement;
      let $resultElementNew;

      before(function () {
        app.modules.autocomplete.background
          .autocomplete.CliqzResultProviders.setCurrentSearchEngine('Google');
        CliqzUtils.setPref('adultContentFilter', 'moderate');
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        }).then(() => {
          app.modules.dropdown.getWindowModule(CliqzUtils.getWindow()).ui.dropdown.onMouseUp({
            originalTarget: $resultElement.querySelectorAll('.buttons .result')[1],
          });

          return waitForPopup().then(function () {
            $resultElementNew = $cliqzResults()[0];
          });
        });
      });

      it('result exists', function () {
        const resultSelector = '.result';
        expect($resultElementNew).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const logoSelector = '.result .icons .icon.search';
        expect($resultElementNew).to.contain(logoSelector);
      });

      it('renders query', function () {
        const querySelector = '.result .abstract .strong';
        expect($resultElementNew).to.contain(querySelector);
        expect($resultElementNew.querySelector(querySelector).textContent.trim()).to.equal('xvideos');
      });

      it('renders divider', function () {
        const dividerSelector = '.result .abstract .divider';
        expect($resultElementNew).to.contain(dividerSelector);
        expect($resultElementNew.querySelector(dividerSelector)).to.have.text('—');
      });

      it('renders url', function () {
        const urlSelector = '.result .abstract .url';
        expect($resultElementNew).to.contain(urlSelector);
        expect($resultElementNew.querySelector(urlSelector)).to.have.text('Search with Google');
      });
    });

    context('click on "Never" button', function () {
      let $resultElement;
      let $resultElementNew;

      before(function () {
        CliqzUtils.setPref('adultContentFilter', 'moderate');
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(function () {
          $resultElement = $cliqzResults()[0];
        }).then(() => {
          app.modules.dropdown.getWindowModule(CliqzUtils.getWindow()).ui.dropdown.onMouseUp({
            originalTarget: $resultElement.querySelectorAll('.buttons .result')[2],
          });

          return waitForPopup().then(function () {
            $resultElementNew = $cliqzResults()[0];
          });
        });
      });

      it('result exists', function () {
        const resultSelector = '.result';
        expect($resultElementNew).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const logoSelector = '.result .icons .logo';
        expect($resultElementNew).to.contain(logoSelector);
      });

      it('renders title', function () {
        const titleSelector = '.result .abstract .title';
        expect($resultElementNew).to.contain(titleSelector);
        expect($resultElementNew.querySelector(titleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('renders divider', function () {
        const dividerSelector = '.result .abstract .divider';
        expect($resultElementNew).to.contain(dividerSelector);
        expect($resultElementNew.querySelector(dividerSelector)).to.have.text('—');
      });

      it('renders url', function () {
        const urlSelector = '.result .abstract .url';
        expect($resultElementNew).to.contain(urlSelector);
        expect($resultElementNew.querySelector(urlSelector)).to.have.text(results[0].url);
      });

      it('renders description', function () {
        const descriptionSelector = '.result .abstract .description';
        expect($resultElementNew).to.contain(descriptionSelector);
        expect($resultElementNew.querySelector(descriptionSelector))
          .to.have.text(results[0].snippet.description);
      });
    });

    context('set "Never block"', function () {
      let $resultElement;

      before(function () {
        CliqzUtils.setPref('adultContentFilter', 'liberal');
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(() => {
          $resultElement = $cliqzResults()[0];
        });
      });

      it('result exists', function () {
        const resultSelector = '.result';
        expect($resultElement).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const logoSelector = '.result .icons .logo';
        expect($resultElement).to.contain(logoSelector);
      });

      it('renders title', function () {
        const titleSelector = '.result .abstract .title';
        expect($resultElement).to.contain(titleSelector);
        expect($resultElement.querySelector(titleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('renders divider', function () {
        const dividerSelector = '.result .abstract .divider';
        expect($resultElement).to.contain(dividerSelector);
        expect($resultElement.querySelector(dividerSelector)).to.have.text('—');
      });

      it('renders url', function () {
        const urlSelector = '.result .abstract .url';
        expect($resultElement).to.contain(urlSelector);
        expect($resultElement.querySelector(urlSelector)).to.have.text(results[0].url);
      });

      it('renders description', function () {
        const descriptionSelector = '.result .abstract .description';
        expect($resultElement).to.contain(descriptionSelector);
        expect($resultElement.querySelector(descriptionSelector))
          .to.have.text(results[0].snippet.description);
      });
    });

    context('set "Always block"', function () {
      let $resultElement;

      before(function () {
        app.modules.autocomplete.background
          .autocomplete.CliqzResultProviders.setCurrentSearchEngine('Google');
        CliqzUtils.setPref('adultContentFilter', 'conservative');
        respondWith({ results });
        fillIn('xvideos');

        return waitForPopup().then(() => {
          $resultElement = $cliqzResults()[0];
        });
      });

      it('result exists', function () {
        const resultSelector = '.result';
        expect($resultElement).to.contain(resultSelector);
      });

      it('renders logo', function () {
        const logoSelector = '.result .icons .icon.search';
        expect($resultElement).to.contain(logoSelector);
      });

      it('renders query', function () {
        const querySelector = '.result .abstract .strong';
        expect($resultElement).to.contain(querySelector);
        expect($resultElement.querySelector(querySelector).textContent.trim()).to.equal('xvideos');
      });

      it('renders divider', function () {
        const dividerSelector = '.result .abstract .divider';
        expect($resultElement).to.contain(dividerSelector);
        expect($resultElement.querySelector(dividerSelector)).to.have.text('—');
      });

      it('renders url', function () {
        const urlSelector = '.result .abstract .url';
        expect($resultElement).to.contain(urlSelector);
        expect($resultElement.querySelector(urlSelector)).to.have.text('Search with Google');
      });
    });
  });
}
