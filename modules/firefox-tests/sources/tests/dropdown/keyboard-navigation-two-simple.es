/* global it, expect, respondWith, fillIn, waitForPopup, press, release
$cliqzResults, withHistory, CliqzUtils, waitFor */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

import { results, resultsNew, friendlyUrl } from './fixtures/resultsTwoSimple';

export default function () {
  context('keyboard navigation for two simple results with autocomplete', function () {
    let resultElement;
    let result1Element;
    let result2Element;
    const query = 'ro';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const popup = win.CLIQZ.Core.popup;
    const result1Selector = `a.result[href="${results[0].url}"]`;
    const result2Selector = `a.result[href="${results[1].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    it('two results were rendered', function () {
      expect(resultElement).to.contain(result1Selector);
      expect(resultElement).to.contain(result2Selector);
    });

    it('first result is selected', function () {
      result1Element = resultElement.querySelector(result1Selector);
      expect(result1Element.classList.contains('selected')).to.be.true;
    });

    it('there is autocompleted link in url bar', function () {
      expect(urlBar.textValue).to.equal(friendlyUrl[results[0].url]);
    });

    it('only one element is selected', function () {
      expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
    });

    context('press arrowDown', function () {
      beforeEach(function () {
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !result1Element.classList.contains('selected') && urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"] .content .url`).textContent;
        });
      });

      it('second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('press arrowDown again - first result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
        });
      });

      it('press arrowDown again - there is correct url in the url bar', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(`a.result[href="${results[1].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });
    });

    context('press arrowUp', function () {
      beforeEach(function () {
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !result1Element.classList.contains('selected') && urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"] .content .url`).textContent;
        });
      });

      it('second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('press arrowUp again - first result is selected', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
        });
      });

      it('press arrowUp again - there is correct url in the url bar', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[1].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });
    });

    context('press Tab', function () {
      beforeEach(function () {
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected') && urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"] .content .url`).textContent;
        });
      });

      it('second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('press Tab again - first result is selected', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
        });
      });

      it('press Tab again - there is correct url in the url bar', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(`a.result[href="${results[1].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });
    });

    context('press Shift + Tab', function () {
      beforeEach(function () {
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected') && urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"] .content .url`).textContent;
        });
      });

      afterEach(function () {
        release('Shift', 'ShiftLeft');
      });

      it('second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('press Shift + Tab again - first result is selected', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
        });
      });

      it('there is correct url in the url bar', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[1].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });
    });

    context('press arrowLeft', function () {
      beforeEach(function () {
        press('ArrowLeft', 'ArrowLeft');
        return waitFor(function () {
          return popup.mPopupOpen === false;
        });
      });

      it('there is autocompleted link in url bar', function () {
        expect(urlBar.textValue).to.equal(friendlyUrl[results[0].url]);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(query.length);
      });

      context('press arrowDown', function () {
        let visitSelector;

        beforeEach(function () {
          visitSelector = '.result[href=\'moz-action:visiturl,{"url":"royalgames.com"}\']';
          withHistory([]);
          respondWith({ results: resultsNew });
          press('ArrowDown', 'ArrowDown');
          return waitForPopup().then(function () {
            resultElement = $cliqzResults()[0];
          });
        });

        it('cursor is moved to the end of the string', function () {
          expect(urlBar.selectionStart).to.equal(friendlyUrl[results[0].url].length);
          expect(urlBar.selectionEnd).to.equal(friendlyUrl[results[0].url].length);
        });

        it('two new results were rendered: search with and normal result', function () {
          expect(resultElement.querySelectorAll('.result').length).to.equal(2);
          expect(resultElement).to.contain(visitSelector);
          expect(resultElement).to.contain(`a.result[href="${resultsNew[0].url}"]`);
        });

        it('"visit" result is selected', function () {
          const resultVisitElement = resultElement.querySelector(visitSelector);
          expect(resultVisitElement.classList.contains('selected')).to.be.true;
        });

        it('only one element is selected', function () {
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });
    });

    context('press arrowRight', function () {
      beforeEach(function () {
        press('ArrowRight', 'ArrowRight');
        return waitFor(function () {
          return popup.mPopupOpen === false;
        });
      });

      it('there is autocompleted link in url bar', function () {
        expect(urlBar.textValue).to.equal(friendlyUrl[results[0].url]);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(friendlyUrl[results[0].url].length);
        expect(urlBar.selectionEnd).to.equal(friendlyUrl[results[0].url].length);
      });

      context('press arrowDown', function () {
        let visitSelector;

        beforeEach(function () {
          visitSelector = '.result[href=\'moz-action:visiturl,{"url":"royalgames.com"}\']';
          withHistory([]);
          respondWith({ results: resultsNew });
          press('ArrowDown', 'ArrowDown');
          return waitForPopup().then(function () {
            resultElement = $cliqzResults()[0];
          });
        });

        it('two new results were rendered: search with and normal result', function () {
          expect(resultElement.querySelectorAll('.result').length).to.equal(2);
          expect(resultElement).to.contain(visitSelector);
          expect(resultElement).to.contain(`a.result[href="${resultsNew[0].url}"]`);
        });

        it('"visit" result is selected', function () {
          const resultVisitElement = resultElement.querySelector(visitSelector);
          expect(resultVisitElement.classList.contains('selected')).to.be.true;
        });

        it('only one element is selected', function () {
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });
    });
  });
}
