/* global it, expect, respondWith, fillIn, waitForPopup, press, release,
$cliqzResults, withHistory, CliqzUtils, waitFor */
/* eslint func-names: ["error", "never"] */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

import { results } from './fixtures/resultsTwoSimpleWithoutAutocomplete';

export default function () {
  context('keyboard navigation for two simple results without autocomplete', function () {
    let resultElement;
    let searchWithElement;
    let result1Element;
    let result2Element;
    const query = 'qws';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const popup = win.CLIQZ.Core.popup;
    const searchWithSelector = 'a.result.search';
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

    it('"search with" + two results were rendered', function () {
      expect(resultElement).to.contain(searchWithSelector);
      expect(resultElement).to.contain(result1Selector);
      expect(resultElement).to.contain(result2Selector);
    });

    it('only "search with" result is selected', function () {
      result1Element = resultElement.querySelector(searchWithSelector);
      expect(result1Element.classList.contains('selected')).to.be.true;
      expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
    });

    it('text "Search with Google" is visible', function () {
      expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
        .visibility).to.equal('visible');
    });

    context('press arrowDown', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only first result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('text "Search with Google" is hidden', function () {
        expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
          .visibility).to.equal('hidden');
      });

      it('press arrowDown again - only second result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(result2Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowDown again - there is correct url in the url bar', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result1Selector).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[1].url);
        });
      });

      it('press arrowDown two times - only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          press('ArrowDown', 'ArrowDown');
          return waitFor(function () {
            return !result2Element.classList.contains('selected');
          });
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowDown two times - query is in the url bar', function () {
        press('ArrowDown', 'ArrowDown');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result1Selector).getAttribute('href');
        }).then(function () {
          press('ArrowDown', 'ArrowDown');
          return waitFor(function () {
            return urlBar.textValue !==
              resultElement.querySelector(result2Selector).getAttribute('href');
          });
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press arrowUp', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('text "Search with Google" is hidden', function () {
        expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
          .visibility).to.equal('hidden');
      });

      it('press arrowUp again - only first result is selected', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowUp again - there is correct url in the url bar', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result2Selector).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });

      it('press arrowUp two times - only "search with" result is selected', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          press('ArrowUp', 'ArrowUp');
          return waitFor(function () {
            return !result1Element.classList.contains('selected');
          });
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowUp two times - query is in the url bar', function () {
        press('ArrowUp', 'ArrowUp');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result2Selector).getAttribute('href');
        }).then(function () {
          press('ArrowUp', 'ArrowUp');
          return waitFor(function () {
            return urlBar.textValue !==
              resultElement.querySelector(result1Selector).getAttribute('href');
          });
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press Tab', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('Tab', 'Tab');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      it('only first result is selected', function () {
        expect(result1Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[0].url);
      });

      it('text "Search with Google" is hidden', function () {
        expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
          .visibility).to.equal('hidden');
      });

      it('press Tab again - only second result is selected', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          expect(result2Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Tab again - there is correct url in the url bar', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result1Selector).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[1].url);
        });
      });

      it('press Tab two times - only "search with" result is selected', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result1Element.classList.contains('selected');
        }).then(function () {
          press('Tab', 'Tab');
          return waitFor(function () {
            return !result2Element.classList.contains('selected');
          });
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Tab two times - query is in the url bar', function () {
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result1Selector).getAttribute('href');
        }).then(function () {
          press('Tab', 'Tab');
          return waitFor(function () {
            return urlBar.textValue !==
              resultElement.querySelector(result2Selector).getAttribute('href');
          });
        }).then(function () {
          expect(urlBar.textValue).to.equal(query);
        });
      });
    });

    context('press Shift + Tab', function () {
      beforeEach(function () {
        searchWithElement = resultElement.querySelector(searchWithSelector);
        result1Element = resultElement.querySelector(result1Selector);
        result2Element = resultElement.querySelector(result2Selector);
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !searchWithElement.classList.contains('selected') && urlBar.textValue !== query;
        });
      });

      afterEach(function () {
        release('Shift', 'ShiftLeft');
      });

      it('only second result is selected', function () {
        expect(result2Element.classList.contains('selected')).to.be.true;
        expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
      });

      it('there is correct url in the url bar', function () {
        expect(urlBar.textValue).to.equal(results[1].url);
      });

      it('text "Search with Google" is hidden', function () {
        expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
          .visibility).to.equal('hidden');
      });

      it('press Shift + Tab again - only first result is selected', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          expect(result1Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Shift + Tab again - there is correct url in the url bar', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result2Selector).getAttribute('href');
        }).then(function () {
          expect(urlBar.textValue).to.equal(results[0].url);
        });
      });

      it('press Shift + Tab two times - only "search with" result is selected', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return !result2Element.classList.contains('selected');
        }).then(function () {
          press('Shift', 'ShiftLeft');
          press('Tab', 'Tab');
          return waitFor(function () {
            return !result1Element.classList.contains('selected');
          });
        }).then(function () {
          expect(searchWithElement.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press Shift + Tab two times - query is in the url bar', function () {
        press('Shift', 'ShiftLeft');
        press('Tab', 'Tab');
        return waitFor(function () {
          return urlBar.textValue !==
            resultElement.querySelector(result2Selector).getAttribute('href');
        }).then(function () {
          press('Shift', 'ShiftLeft');
          press('Tab', 'Tab');
          return waitFor(function () {
            return urlBar.textValue !==
              resultElement.querySelector(result1Selector).getAttribute('href');
          });
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

      it('query is in the url bar', function () {
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

      it('press arrowDown - "search with" + two results were rendered', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(resultElement).to.contain(searchWithSelector);
          expect(resultElement).to.contain(result1Selector);
          expect(resultElement).to.contain(result2Selector);
        });
      });

      it('press arrowDown - only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          result1Element = resultElement.querySelector(searchWithSelector);
          expect(result1Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowDown - text "Search with Google" is visible', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
            .visibility).to.equal('visible');
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

      it('query is in the url bar', function () {
        expect(urlBar.textValue).to.equal(query);
      });

      it('cursor is at the right place', function () {
        expect(urlBar.selectionStart).to.equal(query.length);
        expect(urlBar.selectionEnd).to.equal(query.length);
      });

      it('press arrowDown - "search with" + two results were rendered', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(resultElement).to.contain(searchWithSelector);
          expect(resultElement).to.contain(result1Selector);
          expect(resultElement).to.contain(result2Selector);
        });
      });

      it('press arrowDown - only "search with" result is selected', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          result1Element = resultElement.querySelector(searchWithSelector);
          expect(result1Element.classList.contains('selected')).to.be.true;
          expect(resultElement.querySelectorAll('.selected').length).to.equal(1);
        });
      });

      it('press arrowDown - text "Search with Google" is visible', function () {
        press('ArrowDown', 'ArrowDown');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        }).then(function () {
          expect(win.getComputedStyle(resultElement.querySelector('.result.search .abstract .url'))
            .visibility).to.equal('visible');
        });
      });
    });
  });
}
