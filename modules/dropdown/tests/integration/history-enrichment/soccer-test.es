import {
  blurUrlBar,
  $cliqzResults,
  expect,
  testsEnabled,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory
} from '../helpers';

import resultsLigaGame from '../fixtures/resultsSoccerLigaGame';
import resultsLigaGroup from '../fixtures/resultsSoccerLigaGroup';
import resultsLigaTable from '../fixtures/resultsSoccerLigaTable';
import resultsLiveTicker from '../fixtures/resultsSoccerLiveTicker';

export default function () {
  if (!testsEnabled()) { return; }

  context('history enrichment for soccer', function () {
    context('liga game', function () {
      let $historyElement;
      const results = resultsLigaGame;
      const query = 'fcbayern';
      const url = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
      });

      it('renders SC soccer and injected news only in history', async function () {
        await waitFor(() => {
          expect($historyElement()).to.exist;
          expect($historyElement().querySelectorAll('.buttons .btn')).to.have.length(4);
          expect($historyElement().querySelector('.result.soccer-title')).to.exist;
          expect($historyElement().querySelector('.soccer .table')).to.exist;
          expect($historyElement().querySelector('.soccer .news-injection-title')).to.exist;
          expect($historyElement().querySelector('.soccer .news-injection')).to.exist;
          return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
            .to.have.length(1);
        }, 600);
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
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(() => {
          expect($historyElement()).to.exist;
          expect($historyElement().querySelector('.result.soccer-title')).to.exist;
          expect($historyElement().querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
          return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
            .to.have.length(1);
        }, 600);
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
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(() => {
          expect($historyElement()).to.exist;
          expect($historyElement().querySelector('.result.soccer-title')).to.exist;
          expect($historyElement().querySelector('.soccer .table')).to.exist;
          return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
            .to.have.length(1);
        }, 600);
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
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = () => $cliqzResults.querySelector(`.result[data-url="${url}"]`).closest('.history');
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(() => {
          expect($historyElement()).to.exist;
          expect($historyElement().querySelector('.result.soccer-title')).to.exist;
          expect($historyElement().querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
          return expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
            .to.have.length(1);
        }, 600);
      });
    });
  });
}
