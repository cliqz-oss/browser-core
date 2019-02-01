import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';

import resultsLigaGame from '../../../core/integration/fixtures/resultsSoccerLigaGame';
import resultsLigaGroup from '../../../core/integration/fixtures/resultsSoccerLigaGroup';
import resultsLigaTable from '../../../core/integration/fixtures/resultsSoccerLigaTable';
import resultsLiveTicker from '../../../core/integration/fixtures/resultsSoccerLiveTicker';

export default function () {
  context('history enrichment for soccer', function () {
    context('liga game', function () {
      let $historyElement;
      const results = resultsLigaGame;
      const query = 'fcbayern';
      const url = results[0].url;

      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = async () => {
          const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
          return $result.closest('.history');
        };
      });

      it('renders SC soccer and injected news only in history', async function () {
        await waitFor(async () => {
          const $history = await $historyElement();
          expect($history).to.exist;
          expect($history.querySelectorAll('.buttons .btn')).to.have.length(4);
          expect($history.querySelector('.result.soccer-title')).to.exist;
          expect($history.querySelector('.soccer .table')).to.exist;
          expect($history.querySelector('.soccer .news-injection-title')).to.exist;
          expect($history.querySelector('.soccer .news-injection')).to.exist;
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
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
        await blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = async () => {
          const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
          return $result.closest('.history');
        };
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(async () => {
          const $history = await $historyElement();
          expect($history).to.exist;
          expect($history.querySelector('.result.soccer-title')).to.exist;
          expect($history.querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
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
        await blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = async () => {
          const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
          return $result.closest('.history');
        };
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(async () => {
          const $history = await $historyElement();
          expect($history).to.exist;
          expect($history.querySelector('.result.soccer-title')).to.exist;
          expect($history.querySelector('.soccer .table')).to.exist;
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
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
        await blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyElement = async () => {
          const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
          return $result.closest('.history');
        };
      });

      it('renders SC soccer table only in history', async function () {
        await waitFor(async () => {
          const $history = await $historyElement();
          expect($history).to.exist;
          expect($history.querySelector('.result.soccer-title')).to.exist;
          expect($history.querySelector('.soccer .wrapper.dropdown-tabs')).to.exist;
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
            .to.have.length(1);
        }, 600);
      });
    });
  });
}
