/* global it, expect, respondWith, fillIn, waitForPopup, press, release
$cliqzResults, withHistory, CliqzUtils, waitFor */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

import { unitConverterAndSimpleResults } from './fixtures/resultsSimple';

export default function () {
  context('keyboard navigation for simple result and unit converter result', function () {
    const results = unitConverterAndSimpleResults;
    let resultElement;
    let searchWithElement;
    let result1Element;
    const query = '1 km in m';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const popup = win.CLIQZ.Core.popup;
    const searchWithSelector = '.result.search';
    const converterSelector = '#calc-answer.result';
    const result1Selector = `a.result[href="${results[0].url}"]`;

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    it('"search with", unit converter result, and simple result were rendered', function () {
      expect(resultElement).to.contain(searchWithSelector);
      expect(resultElement).to.contain(converterSelector);
      expect(resultElement).to.contain(result1Selector);
    });

    it('only "search with" result is selected', function () {
      searchWithElement = resultElement.querySelector(searchWithSelector);
      expect(searchWithElement.classList.contains('selected')).to.be.true;
      expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
    });

    it('there is query in the url bar', function () {
      expect(urlBar.textValue).to.equal(query);
    });

    context('press arrowDown', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only simple result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('press arrowDown again -  only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowDown again - there is query in the url bar', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(`a.result[href="${results[0].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press arrowUp', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only simple result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('press arrowUp again - only "search with" result is selected', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowUp again - there is query in the url bar', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press Tab', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        press('Tab', 'Tab');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only simple result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('press Tab again -  only "search with" result is selected', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Tab again - there is query in the url bar', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(`a.result[href="${results[0].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press Shift Tab', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      afterEach(function () {
        release('Shift', 'ShiftLeft');
      });

      it('only simple result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('press Shift Tab again - only "search with" result is selected', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Shift tab again - there is correct url in the url bar', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !== resultElement
            .querySelector(`a.result[href="${results[0].url}"]`).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
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

      it('there is query in url bar', function () {
        expect(urlBar.textValue).to.equal(query);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(query.length - 1);
        expect(urlBar.selectionEnd).to.equal(query.length - 1);
      });

      it('press arrowDown - cursor moved to end of the string', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          expect(urlBar.selectionStart).to.equal(query.length);
          expect(urlBar.selectionEnd).to.equal(query.length);
        });
      });

      it('press arrowDown - "search with", unit converter, and simple results were rendered', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(resultElement).to.contain(searchWithSelector);
          expect(resultElement).to.contain(converterSelector);
          expect(resultElement).to.contain(result1Selector);
        });
      });

      it('press arrowDown - only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          searchWithElement = resultElement.querySelector(searchWithSelector);
          expect(searchWithElement.classList.contains('selected')).to.be.true;
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

      it('there is query in url bar', function () {
        expect(urlBar.textValue).to.equal(query);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(query.length);
      });

      it('press arrowDown - "search with", unit converter, and simple results were rendered', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(resultElement).to.contain(searchWithSelector);
          expect(resultElement).to.contain(converterSelector);
          expect(resultElement).to.contain(result1Selector);
        });
      });

      it('press arrowDown - only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          searchWithElement = resultElement.querySelector(searchWithSelector);
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });
    });
  });
}
