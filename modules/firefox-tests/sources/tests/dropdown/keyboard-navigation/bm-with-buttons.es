import {
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';
import expectSelection from './common';
import { bmWithButtons } from '../fixtures/resultsBigMachineWithButtons';

export default function () {
  context('keyboard navigation for bm results with buttons', function () {
    let $resultElement;
    let $result1Element;
    let firstElementArray = [];
    let otherElementsArray = [];
    let navigationArray = [];
    const results = bmWithButtons;
    const query = 'google';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const result1Selector = `a.result[data-url="${results[0].url}"]`;
    const result2Selector = `a.result[data-url="${results[1].url}"]`;
    const button1Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[0].url}"]`;
    const button2Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[1].url}"]`;
    const button3Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[2].url}"]`;
    const button4Selector = `a.result.btn[data-url="${results[0].snippet.deepResults[0].links[3].url}"]`;

    beforeEach(function () {
      blurUrlBar();
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $result1Element = $resultElement.querySelector(result1Selector);
        firstElementArray = [
          {
            el: $result1Element,
            urlBarText: results[0].snippet.friendlyUrl
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(button1Selector),
            urlBarText: results[0].snippet.deepResults[0].links[0].url
          },
          {
            el: $resultElement.querySelector(button2Selector),
            urlBarText: results[0].snippet.deepResults[0].links[1].url
          },
          {
            el: $resultElement.querySelector(button3Selector),
            urlBarText: results[0].snippet.deepResults[0].links[2].url
          },
          {
            el: $resultElement.querySelector(button4Selector),
            urlBarText: results[0].snippet.deepResults[0].links[3].url
          },
          {
            el: $resultElement.querySelector(result2Selector),
            urlBarText: results[1].url
          }
        ];
      });
    });

    it('two results and four buttons were rendered', function () {
      expect($resultElement).to.contain(result1Selector);
      expect($resultElement).to.contain(result2Selector);
      expect($resultElement.querySelectorAll('.btn').length).to.equal(4);
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
