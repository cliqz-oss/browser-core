/* global window */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsBigMachineWithButtons';
import historyResults from './fixtures/historyResultsHistoryAndNews';

export default function ({ hasHistoryUrl }) {
  context('for a history and news rich header', function () {
    const historyResultsSelector = '.history a.result:not(.sessions)';
    let $resultElement;
    let historyItems;
    let historyIndex;

    before(function () {
      window.preventRestarts = true;
      respondWith({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
        historyItems = $resultElement.querySelectorAll(historyResultsSelector);
      });
    });

    beforeEach(function () {
      historyIndex = historyItems.length;
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('renders history results', function () {
      it('successfully', function () {
        expect(historyItems).to.not.be.empty;
      });

      it('in correct amount', function () {
        expect(historyItems.length).to.equal(historyResults.length);
      });

      it('with an option to search in all history results', function () {
        const historySearchSelector = '.history.last';
        const historySearchItem = $resultElement.querySelectorAll(historySearchSelector);
        expect(historySearchItem).to.exist;
      });
    });

    context('each rendered history result', function () {
      it('has an existing logo', function () {
        const historyLogoSelector = 'span.logo';

        [...historyItems].forEach(function (history) {
          expect(history.querySelector(historyLogoSelector)).to.exist;
        });
      });

      it('has an existing and correct description', function () {
        const historyDescriptionSelector = 'div.abstract span.title';

        [...historyItems].forEach(function (history) {
          /* The order of history in dropdown is reverted */
          historyIndex -= 1;
          expect(history.querySelector(historyDescriptionSelector))
            .to.contain.text(historyResults[historyIndex].comment);
        });
      });

      it('has an existing domain', function () {
        const historyUrlSelector = 'div.abstract span.url';

        [...historyItems].forEach(function (history) {
          expect(history.querySelector(historyUrlSelector)).to.exist;
        });
      });

      it('links to a correct URL', function () {
        [...historyItems].forEach(function (history) {
          /* The order of history in dropdown is reverted */
          historyIndex -= 1;
          expect(history.dataset.url)
            .to.equal(historyResults[historyIndex].value);
        });
      });
    });

    if (hasHistoryUrl) {
      context('the option to search in all history results', function () {
        it('has an existing and correct icon', function () {
          const historySearchIconSelector = '.history.last span.history-tool';
          const historySearchIcon = $resultElement.querySelector(historySearchIconSelector);
          expect(historySearchIcon).to.exist;

          const win = CliqzUtils.getWindow();
          expect(win.getComputedStyle(
            $resultElement.querySelector(historySearchIconSelector)).backgroundImage)
            .to.contain('history_tool_grey');
        });

        it('has existing and correct text', function () {
          const historySearchTextSelector = '.history.last div.abstract span';
          const historySearchText = $resultElement.querySelector(historySearchTextSelector);
          const locale = CliqzUtils.locale.default;
          const foundInHistory = locale.results_found_in_history.message;
          expect(historySearchText).to.contain.text(foundInHistory);
        });
      });
    }
  });
}
