/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  press,
  pressAndWaitFor,
  release,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from '../helpers';
import expectSelection from './common';
import { explicitAndSimpleResults } from '../fixtures/resultsAdultQuestion';

export default function () {
  context('keyboard navigation for adult question', function () {
    let $resultElement;
    let $searchWithElement;
    let firstElementArray;
    let otherElementsArray;
    let navigationArray;
    let $showOnceButton;
    let $alwaysButton;
    let $neverButton;
    const results = explicitAndSimpleResults;
    const query = 'po';
    const win = CliqzUtils.getWindow();
    const urlBar = win.CLIQZ.Core.urlbar;
    const searchWithSelector = '.result.search';
    const questionSelector = '.result.adult-question';
    const showOnceSelector = '.btn[href=\'cliqz-actions,{"type":"adult","actionName":"allowOnce"}\']';
    const alwaysSelector = '.btn[href=\'cliqz-actions,{"type":"adult","actionName":"block"}\']';
    const neverSelector = '.btn[href=\'cliqz-actions,{"type":"adult","actionName":"allow"}\']';
    const adult1Selector = `a.result[href="${results[0].url}"]`;
    const adult2Selector = `a.result[href="${results[1].url}"]`;
    const normalSelector = `a.result[href="${results[2].url}"]`;

    beforeEach(function () {
      CliqzUtils.setPref('adultContentFilter', 'moderate');
      withHistory({});
      respondWith({ results });
      fillIn(query);
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        firstElementArray = [
          {
            el: $searchWithElement,
            urlBarText: query
          }
        ];
        otherElementsArray = [
          {
            el: $resultElement.querySelector(showOnceSelector),
            urlBarText: query
          },
          {
            el: $resultElement.querySelector(alwaysSelector),
            urlBarText: query
          },
          {
            el: $resultElement.querySelector(neverSelector),
            urlBarText: query
          },
          {
            el: $resultElement.querySelector(normalSelector),
            urlBarText: results[2].url
          },
        ];
      });
    });

    afterEach(function () {
      CliqzUtils.setPref('adultContentFilter', 'moderate');
    });

    it('renders "search with", question, and normal result', function () {
      expect($resultElement).to.contain(searchWithSelector);
      expect($resultElement).to.contain(questionSelector);
      expect($resultElement).to.contain(showOnceSelector);
      expect($resultElement).to.contain(alwaysSelector);
      expect($resultElement).to.contain(neverSelector);
      expect($resultElement).to.contain(normalSelector);
    });

    context('navigation with arrowDown', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current, index) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowDown' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  (index >= 3) ? urlBar.textValue !== current.urlBarText : true;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigation with arrowUp', function () {
      beforeEach(function () {
        // slice().reverse() creates a new array with the elements in reverse order
        navigationArray = firstElementArray.concat(otherElementsArray.slice().reverse());
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current, index) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'ArrowUp' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  (index <= 1) ? urlBar.textValue !== current.urlBarText : true;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigation with Tab', function () {
      beforeEach(function () {
        navigationArray = firstElementArray.concat(otherElementsArray);
      });

      it('correct element is selected and there is correct url in the url bar', function () {
        return navigationArray
          .reduce(function (chain, current, index) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab' });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  (index >= 3) ? urlBar.textValue !== current.urlBarText : true;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
          .reduce(function (chain, current, index) {
            return chain.then(function () {
              expectSelection($resultElement, current.el, current.urlBarText, urlBar);
              press({ key: 'Tab', shiftKey: true });
              return waitFor(function () {
                return !current.el.classList.contains('selected') &&
                  (index <= 1) ? urlBar.textValue !== current.urlBarText : true;
              }, 300);
            });
          }, Promise.resolve())
          .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
      });
    });

    context('navigate to "Show once" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          })
          .then(function () {
            $searchWithElement = $resultElement.querySelector(searchWithSelector);
            firstElementArray = [
              {
                el: $searchWithElement,
                urlBarText: query
              }
            ];
            otherElementsArray = [
              {
                el: $resultElement.querySelector(adult1Selector),
                urlBarText: results[0].url
              },
              {
                el: $resultElement.querySelector(adult2Selector),
                urlBarText: results[1].url
              },
              {
                el: $resultElement.querySelector(normalSelector),
                urlBarText: results[2].url
              },
            ];
          });
      });

      it('"search with", two adult results, and normal result were rendered', function () {
        expect($resultElement).to.contain(searchWithSelector);
        expect($resultElement).to.contain(adult1Selector);
        expect($resultElement).to.contain(adult2Selector);
        expect($resultElement).to.contain(normalSelector);
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });
    });

    context('navigate to "Always" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        $alwaysButton = $resultElement.querySelector(alwaysSelector);
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $alwaysButton.classList.contains('selected'));
          })
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          })
          .then(function () {
            $searchWithElement = $resultElement.querySelector(searchWithSelector);
            navigationArray = [
              {
                el: $searchWithElement,
                urlBarText: query
              },
              {
                el: $resultElement.querySelector(normalSelector),
                urlBarText: results[2].url
              }
            ];
          });
      });

      it('"search with", and normal result were rendered', function () {
        expect($resultElement).to.contain(searchWithSelector);
        expect($resultElement).to.contain(normalSelector);
      });

      context('navigation with arrowDown', function () {
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });

      context('navigation with arrowUp', function () {
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });

      context('navigation with Tab', function () {
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });

      context('navigation with Shift + Tab', function () {
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });
    });

    context('navigate to "Never" and press Enter', function () {
      beforeEach(function () {
        $showOnceButton = $resultElement.querySelector(showOnceSelector);
        $alwaysButton = $resultElement.querySelector(alwaysSelector);
        $neverButton = $resultElement.querySelector(neverSelector);
        $searchWithElement = $resultElement.querySelector(searchWithSelector);
        return pressAndWaitFor({ key: 'ArrowDown' }, () =>
          $showOnceButton.classList.contains('selected'))
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $alwaysButton.classList.contains('selected'));
          })
          .then(function () {
            pressAndWaitFor({ key: 'ArrowDown' }, () =>
              $neverButton.classList.contains('selected'));
          })
          .then(function () {
            press({ key: 'Enter' });
            return waitFor(function () {
              $resultElement = $cliqzResults()[0];
              return $resultElement.querySelectorAll('.btn').length === 0;
            });
          })
          .then(function () {
            $searchWithElement = $resultElement.querySelector(searchWithSelector);
            firstElementArray = [
              {
                el: $searchWithElement,
                urlBarText: query
              }
            ];
            otherElementsArray = [
              {
                el: $resultElement.querySelector(adult1Selector),
                urlBarText: results[0].url
              },
              {
                el: $resultElement.querySelector(adult2Selector),
                urlBarText: results[1].url
              },
              {
                el: $resultElement.querySelector(normalSelector),
                urlBarText: results[2].url
              },
            ];
          });
      });

      it('"search with", two adult results, and normal result were rendered', function () {
        expect($resultElement).to.contain(searchWithSelector);
        expect($resultElement).to.contain(adult1Selector);
        expect($resultElement).to.contain(adult2Selector);
        expect($resultElement).to.contain(normalSelector);
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
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
            .then(() => expectSelection($resultElement, $searchWithElement, query, urlBar));
        });
      });
    });
  });
}
