import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from '../helpers';

import soccerLigaGame from '../../../core/integration/fixtures/resultsSoccerLigaGame';
import soccerLigaGroup from '../../../core/integration/fixtures/resultsSoccerLigaGroup';

export default function () {
  describe('deduplication for SC results of type 2', function () {
    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('2 history results, second url has rich data', function () {
      const results = [{ url: soccerLigaGame[0].url }].concat(soccerLigaGroup);
      let $historyElement1;
      let $historyElement2;
      const query = 'bundesliga';
      const url1 = results[0].url;
      const url2 = results[1].url;

      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url1 }, { value: url2 }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyElement1 = async () => {
          const $result1 = await $cliqzResults.querySelector(`.result[data-url="${url1}"]`);
          return $result1.closest('.history');
        };
        $historyElement2 = async () => {
          const $result2 = await $cliqzResults.querySelector(`.result[data-url="${url2}"]`);
          return $result2.closest('.history');
        };
      });

      it('renders only history results', async function () {
        await waitFor(async () => {
          const $history1 = await $historyElement1();
          const $history2 = await $historyElement2();
          expect($history1.querySelector(`.result[data-url="${url1}"]`)).to.exist;
          expect($history2.querySelector(`.result[data-url="${url2}"]`)).to.exist;
          expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url1}"]`))
            .to.have.length(1);
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url2}"]`))
            .to.have.length(1);
        }, 600);
      });

      it('renders rich data for the second url', async function () {
        await waitFor(async () => {
          const $history2 = await $historyElement2();
          return expect($history2.querySelector('.soccer')).to.exist;
        }, 1000);
      });
    });

    context('2 history results, both urls have rich data', function () {
      const results = soccerLigaGame.concat(soccerLigaGroup);
      let $historyElement1;
      let $historyElement2;
      const query = 'bundesliga';
      const url1 = results[0].url;
      const url2 = results[1].url;

      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url1 }, { value: url2 }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyElement1 = async () => {
          const $result1 = await $cliqzResults.querySelector(`.result[data-url="${url1}"]`);
          return $result1.closest('.history');
        };
        $historyElement2 = async () => {
          const $result2 = await $cliqzResults.querySelector(`.result[data-url="${url2}"]`);
          return $result2.closest('.history');
        };
      });

      it('renders only history result', async function () {
        await waitFor(async () => {
          const $history1 = await $historyElement1();
          const $history2 = await $historyElement2();
          expect($history1).to.exist;
          expect($history2).to.exist;
          expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url1}"]`))
            .to.have.length(1);
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url2}"]`))
            .to.have.length(1);
        }, 600);
      });

      it('renders rich data only for the first url', async function () {
        await waitFor(async () => {
          const $history1 = await $historyElement1();
          const $history2 = await $historyElement2();
          expect($history1.querySelector('.soccer')).to.exist;
          return expect($history2.querySelector('.soccer')).to.not.exist;
        }, 600);
      });
    });

    context('1 history and 1 backend, both urls have rich data', function () {
      const results = soccerLigaGame.concat(soccerLigaGroup);
      let $historyElement;
      let $resultElement;
      const query = 'bundesliga';
      const url1 = results[0].url;
      const url2 = results[1].url;

      before(async function () {
        await blurUrlBar();
        withHistory([{ value: url1 }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyElement = await waitFor(async () => {
          const $result1 = await $cliqzResults.querySelector(`.result[data-url="${url1}"]`);
          return $result1.closest('.history');
        });
        $resultElement = await waitFor(async () => {
          const $result2 = await $cliqzResults.querySelector(`.result[data-url="${url2}"]`);
          return $result2.closest('.cliqz-result');
        });
      });

      it('renders history and backend results', function () {
        expect($historyElement.querySelector(`.result[data-url="${url1}"]`)).to.exist;
        expect($resultElement.querySelector(`.result[data-url="${url2}"]`)).to.exist;
        expect($resultElement).to.not.have.class('history');
      });

      it('renders rich data only for the first url', function () {
        expect($historyElement.querySelector('.soccer')).to.exist;
        expect($resultElement.querySelector('.soccer')).to.not.exist;
      });

      it('both results were rendered only once', async function () {
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url1}"]`))
          .to.have.length(1);
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url2}"]`))
          .to.have.length(1);
      });
    });

    context('2 backend results, both urls have rich data', function () {
      const results = soccerLigaGame.concat(soccerLigaGroup);
      let $resultElement1;
      let $resultElement2;
      const query = 'bundesliga';
      const url1 = results[0].url;
      const url2 = results[1].url;

      before(async function () {
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $resultElement1 = await waitFor(async () => {
          const $result1 = await $cliqzResults.querySelector(`.result[data-url="${url1}"]`);
          return $result1.closest('.cliqz-result');
        });
        $resultElement2 = await waitFor(async () => {
          const $result2 = await $cliqzResults.querySelector(`.result[data-url="${url2}"]`);
          return $result2.closest('.cliqz-result');
        });
      });

      it('renders backend results', function () {
        expect($resultElement1.querySelector(`.result[data-url="${url1}"]`)).to.exist;
        expect($resultElement2.querySelector(`.result[data-url="${url2}"]`)).to.exist;
        expect($resultElement1).to.not.have.class('history');
        expect($resultElement2).to.not.have.class('history');
      });

      it('renders rich data only for the first url', function () {
        expect($resultElement1.querySelector('.soccer')).to.exist;
        expect($resultElement2.querySelector('.soccer')).to.not.exist;
      });

      it('both results were rendered only once', async function () {
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url1}"]`))
          .to.have.length(1);
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url2}"]`))
          .to.have.length(1);
      });
    });
  });
}
