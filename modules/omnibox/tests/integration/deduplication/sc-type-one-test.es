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

import flightResults from '../../../core/integration/fixtures/resultsFlights';

export default function () {
  describe('position of type one SC', function () {
    context('source link was sent in history', function () {
      let $historyFlightElement;
      const query = 'flight test';
      const results = flightResults.arrivedAllEarly;
      const sourceUrl = results[0].url;

      before(async function () {
        await blurUrlBar();
        withHistory([{ value: sourceUrl }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(2);
        $historyFlightElement = async () => {
          const $historyFlightResult = await $cliqzResults.querySelector('.history.cliqz-result .flight');
          return $historyFlightResult;
        };
      });

      it('renders flight SC only in history', async function () {
        await waitFor(async () => {
          const $historyFlightResult = await $historyFlightElement();
          expect($historyFlightResult).to.exist;
          expect($historyFlightResult.querySelector('.source-link.result')).to.exist;
          expect($historyFlightResult.querySelector('.source-link.result').href)
            .to.equal(sourceUrl);
          return expect(await $cliqzResults.querySelectorAll(`.result[data-url="${sourceUrl}"]`))
            .to.have.length(1);
        }, 600);
      });
    });

    context('source link was sent as backend, there is another history result', function () {
      const query = 'flight test';
      const results = flightResults.arrivedAllEarly;
      const url = 'https://flight-tests.com';

      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        await waitFor(async () => {
          const $historyFlightResult = await $cliqzResults.querySelector('.history.cliqz-result .flight');
          return $historyFlightResult;
        });
        await waitFor(async () => {
          const $result = await $cliqzResults.querySelector(`.result[data-url="${url}"]`);
          return $result;
        });
      });

      after(function () {
        win.preventRestarts = false;
      });

      it('renders flight result on top of history', async function () {
        const $history = await $cliqzResults.querySelectorAll('.history');
        expect($history[0].querySelector('.search')).to.exist;
        expect($history[1].querySelector(`.flight .result[data-url="${results[0].url}"]`)).to.exist;
        expect($history[2].querySelector(`.result[data-url="${url}"]`)).to.exist;
        expect($history[3].querySelector('.result.sessions')).to.exist;
      });

      it('result and flight result were not rendered as backend result', async function () {
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${results[0].url}"]`))
          .to.have.length(1);
        expect(await $cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });
  });
}
