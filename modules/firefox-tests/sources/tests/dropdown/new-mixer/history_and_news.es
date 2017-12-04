/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup,
          $cliqzResults, withHistory, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from '../fixtures/resultsHistoryAndNews';
import historyResults from '../fixtures/historyResultsHistoryAndNews';

export default function ({ hasHistoryUrl }) {
  context('for a history and news rich header', function () {
    const historyResultsSelector = '.history a.result:not(.sessions)';
    let resultElement;
    let historyItems;

    before(function () {
      respondWith({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        historyItems = resultElement.querySelectorAll(historyResultsSelector);
      });
    });

    describe('renders history results', function () {
      it('successfully', function () {
        chai.expect(historyItems).to.not.be.empty;
      });

      it('in correct amount', function () {
        chai.expect(historyItems.length).to.equal(historyResults.length);
      });

      if (hasHistoryUrl) {
        it('with an option to search in all history results', function () {
          const historySearchSelector = '.sessions';
          const historySearchItem = resultElement.querySelectorAll(historySearchSelector);
          chai.expect(historySearchItem).to.exist;
        });
      }
    });

    context('each rendered history result', function () {
      it('has an existing logo', function () {
        const historyLogoSelector = 'span.logo';

        [...historyItems].forEach(function (history) {
          chai.expect(history.querySelector(historyLogoSelector)).to.exist;
        });
      });

      it('has an existing and correct description', function () {
        const historyDescriptionSelector = 'div.abstract span.title';

        [...historyItems].forEach(function (history, historyIndex) {
          chai.expect(history.querySelector(historyDescriptionSelector))
            .to.contain.text(historyResults[historyIndex].comment);
        });
      });

      it('has an existing domain', function () {
        const historyUrlSelector = 'div.abstract span.url';

        [...historyItems].forEach(function (history) {
          chai.expect(history.querySelector(historyUrlSelector)).to.exist;
        });
      });

      it('links to a correct URL', function () {
        [...historyItems].forEach(function (history, historyIndex) {
          chai.expect(history.href)
            .to.equal(historyResults[historyIndex].value);
        });
      });
    });

    context('the option to search in all history results', function () {
      it('has an existing and correct icon', function () {
        const historySearchIconSelector = '.history.last span.history-tool';
        const historySearchIcon = resultElement.querySelector(historySearchIconSelector);
        chai.expect(historySearchIcon).to.exist;

        const win = CliqzUtils.getWindow();
        chai.expect(win.getComputedStyle(
          resultElement.querySelector(historySearchIconSelector)).backgroundImage)
          .to.contain('history_tool_grey');
      });

      it('has existing and correct text', function () {
        const historySearchTextSelector = '.history.last div.abstract span';
        const historySearchText = resultElement.querySelector(historySearchTextSelector);
        const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
        const foundInHistory = locale.results_found_in_history.message;
        chai.expect(historySearchText).to.contain.text(foundInHistory);
      });
    });
  });
}
