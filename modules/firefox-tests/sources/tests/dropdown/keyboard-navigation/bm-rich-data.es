import { expect, respondWith, fillIn, waitForPopup, $cliqzResults, CliqzUtils,
  withHistory, press, waitFor, release } from '../helpers';
import expectSelection from './common';
import { bmWithRichData } from '../fixtures/resultsBigMachineRichData';

export default function () {
  context('keyboard navigation for bm results with rich data', function () {
    let $resultElement;
    let $result1Element;
    let firstElementArray = [];
    let otherElementsArray = [];
    let navigationArray = [];
    const results = bmWithRichData;
    const query = 'github';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;
    const result3Selector = `a.result[data-url="${results[2].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $result1Element = $resultElement.querySelector(result1Selector);
        firstElementArray = [
          {
            el: $result1Element,
            urlBarText: results[0].friendlyUrl
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(result2Selector),
            urlBarText: results[1].url
          },
          {
            el: $resultElement.querySelector(result3Selector),
            urlBarText: results[2].url
          }
        ];
      });
    });

    it('three results and four rich links were rendered', function () {
      expect($resultElement).to.contain(result1Selector);
      expect($resultElement).to.contain(result2Selector);
      expect($resultElement).to.contain(result3Selector);
      expect($resultElement.querySelectorAll('.anchors .result').length).to.equal(4);
    });

    context('navigation with arrowDown', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowDown' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with arrowUp', function () {
      beforeEach(function () {
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowUp' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with Tab', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });

    context('navigation with Shift + Tab', function () {
      beforeEach(function () {
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab', shiftKey: true });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $result1Element, results[0].url, urlBar));
      });
    });
  });
}
