/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaTable';


export default function () {
  context('keyboard navigation for soccer liveticker', function () {
    let $resultElement;
    const query = 'bundesliga tabelle';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const searchWithSelector = '.result.search';
    const parentSelector = `a.result[href="${results[0].url}"]`;
    const soccerTitleSelector = '.result.soccer-title';
    const soccerSelector = '.padded .soccer';
    let errors = [];
    let firstElementArray = [];
    let otherElementsArray = [];
    let navigationArray = [];

    beforeEach(function () {
      withHistory([]);
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        firstElementArray = [
          {
            el: $resultElement.querySelector(searchWithSelector),
            urlBarText: query,
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(parentSelector),
            urlBarText: results[0].url,
          },
          {
            el: $resultElement.querySelector(soccerTitleSelector),
            urlBarText: results[0].snippet.extra.url,
          },
        ];
      });
    });

    it('\'search with\', parent, soccer title, and soccer results were rendered', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(parentSelector);
      expect($resultElement).to.contain(soccerTitleSelector);
      expect($resultElement).to.contain(soccerSelector);
    });

    context('navigation with arrowDown', function () {
      beforeEach(function () {
        errors = [];
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray.reduce(function (chain, current) {
          return chain.then(function () {
            expect(current.el.classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(current.urlBarText);
          })
            .catch(function (error) {
              errors.push(error);
            })
            .then(function () {
              press({ key: 'ArrowDown' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300)
                .catch(function () {
                  throw new Error(`condition is false: ${current.el} is selected
                    or ${current.urlBarText} is in the url bar `);
                });
            });
        }, Promise.resolve())
          .then(function () {
            errors.forEach(function (error) {
              expect(error.message).to.be.empty;
            });
            expect($resultElement.querySelector(searchWithSelector)
              .classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(query);
          });
      });
    });

    context('navigation with arrowUp', function () {
      beforeEach(function () {
        errors = [];
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray.reduce(function (chain, current) {
          return chain.then(function () {
            expect(current.el.classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(current.urlBarText);
          })
            .catch(function (error) {
              errors.push(error);
            })
            .then(function () {
              press({ key: 'ArrowUp' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300)
                .catch(function () {
                  throw new Error(`condition is false: ${current.el} is selected
                    or ${current.urlBarText} is in the url bar `);
                });
            });
        }, Promise.resolve())
          .then(function () {
            errors.forEach(function (error) {
              expect(error.message).to.be.empty;
            });
            expect($resultElement.querySelector(searchWithSelector)
              .classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(query);
          });
      });
    });

    context('navigation with Tab', function () {
      beforeEach(function () {
        errors = [];
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray.reduce(function (chain, current) {
          return chain.then(function () {
            expect(current.el.classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(current.urlBarText);
          })
            .catch(function (error) {
              errors.push(error);
            })
            .then(function () {
              press({ key: 'Tab' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300)
                .catch(function () {
                  throw new Error(`condition is false: ${current.el} is selected
                    or ${current.urlBarText} is in the url bar `);
                });
            });
        }, Promise.resolve())
          .then(function () {
            errors.forEach(function (error) {
              expect(error.message).to.be.empty;
            });
            expect($resultElement.querySelector(searchWithSelector)
              .classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(query);
          });
      });
    });

    context('navigation with Shift+Tab', function () {
      beforeEach(function () {
        errors = [];
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

      afterEach(function () {
        release({ key: 'Shift', code: 'ShiftLeft' });
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray.reduce(function (chain, current) {
          return chain.then(function () {
            expect(current.el.classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(current.urlBarText);
          })
            .catch(function (error) {
              errors.push(error);
            })
            .then(function () {
              press({ key: 'Tab', shiftKey: true });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  urlBar.textValue !== current.urlBarText;
              }, 300)
                .catch(function () {
                  throw new Error(`condition is false: ${current.el} is selected
                    or ${current.urlBarText} is in the url bar `);
                });
            });
        }, Promise.resolve())
          .then(function () {
            errors.forEach(function (error) {
              expect(error.message).to.be.empty;
            });
            expect($resultElement.querySelector(searchWithSelector)
              .classList.contains('selected')).to.be.true;
            expect($resultElement.querySelectorAll('.selected').length).to.equal(1);
            expect(urlBar.textValue).to.equal(query);
          });
      });
    });
  });
}
