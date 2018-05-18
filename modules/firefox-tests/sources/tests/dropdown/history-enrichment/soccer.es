import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';

import resultsLigaGame from '../fixtures/resultsSoccerLigaGame';
import resultsLigaGroup from '../fixtures/resultsSoccerLigaGroup';
import resultsLigaTable from '../fixtures/resultsSoccerLigaTable';
import resultsLiveTicker from '../fixtures/resultsSoccerLiveTicker';

export default function () {
  context('for soccer', function () {
    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('liga game', function () {
      let $historyElement;
      const results = resultsLigaGame;
      const query = 'fcbayern';
      const url = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: url }]);
        respondWith({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = await waitFor(
          () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
        );
      });

      it('renders history result', function () {
        expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
      });

      it('renders buttons in history', function () {
        expect($historyElement.querySelector('.buttons .btn')).to.exist;
        expect($historyElement.querySelectorAll('.buttons .btn')).to.have.length(4);
      });

      it('renders soccer title in history', function () {
        expect($historyElement.querySelector('.result.soccer-title')).to.exist;
      });

      it('renders soccer table in history', function () {
        expect($historyElement.querySelector('.soccer .table')).to.exist;
      });

      it('renders injected news in history', function () {
        expect($historyElement.querySelector('.soccer .news-injection-title')).to.exist;
        expect($historyElement.querySelector('.soccer .news-injection')).to.exist;
      });

      it('result was not rendered as backend result', function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });

    context('liga group', function () {
      let $historyElement;
      const results = resultsLigaGroup;
      const query = 'uefa';
      const url = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: url }]);
        respondWith({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = await waitFor(
          () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
        );
      });

      it('renders history result', function () {
        expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
      });

      it('renders soccer title and table in history', function () {
        expect($historyElement.querySelector('.result.soccer-title')).to.exist;
        expect($historyElement.querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
      });

      it('result was not rendered as backend result', function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });

    context('liga table', function () {
      let $historyElement;
      const results = resultsLigaTable;
      const query = 'bundesliga tabelle';
      const url = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: url }]);
        respondWith({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyElement = await waitFor(
          () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
        );
      });

      it('renders history result', function () {
        expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
      });

      it('renders soccer title and table in history', function () {
        expect($historyElement.querySelector('.result.soccer-title')).to.exist;
        expect($historyElement.querySelector('.soccer .table')).to.exist;
      });

      it('result was not rendered as backend result', function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });

    context('liveticker', function () {
      let $historyElement;
      const results = resultsLiveTicker;
      const query = 'liveticker';
      const url = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: url }]);
        respondWith({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = await waitFor(
          () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history')
        );
      });

      it('renders history result', function () {
        expect($historyElement.querySelector(`.result[data-url="${url}"]`)).to.exist;
      });

      it('renders soccer title and table in history', function () {
        expect($historyElement.querySelector('.result.soccer-title')).to.exist;
        expect($historyElement.querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
      });

      it('result was not rendered as backend result', function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });
  });
}
