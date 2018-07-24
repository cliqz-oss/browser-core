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

import flightResults from '../fixtures/resultsFlights';

export default function () {
  if (!testsEnabled()) { return; }
  describe('position of type one SC', function () {
    context('source link was sent in history', function () {
      let $historyFlightElement;
      const query = 'flight test';
      const results = flightResults.arrivedAllEarly;
      const sourceUrl = results[0].url;

      before(async function () {
        blurUrlBar();
        withHistory([{ value: sourceUrl }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(3);
        $historyFlightElement = () => $cliqzResults.querySelector('.history.cliqz-result .flight');
      });

      it('renders flight SC only in history', async function () {
        await waitFor(() => {
          expect($historyFlightElement()).to.exist;
          expect($historyFlightElement().querySelector('.source-link.result')).to.exist;
          expect($historyFlightElement().querySelector('.source-link.result').href)
            .to.equal(sourceUrl);
          return expect($cliqzResults.querySelectorAll(`.result[data-url="${sourceUrl}"]`))
            .to.have.length(1);
        }, 600);
      });
    });

    context('source link was sent as backend, there is another history result', function () {
      const query = 'flight test';
      const results = flightResults.arrivedAllEarly;
      const url = 'https://flight-tests.com';

      before(async function () {
        window.preventRestarts = true;
        blurUrlBar();
        withHistory([{ value: url }]);
        await mockSearch({ results });
        fillIn(query);
        await waitForPopup(4);
        await waitFor(() => $cliqzResults.querySelector('.history.cliqz-result .flight'));
        await waitFor(() => $cliqzResults.querySelector(`.result[data-url="${url}"]`));
      });

      after(function () {
        window.preventRestarts = false;
      });

      it('renders flight result on top of history', function () {
        expect($cliqzResults.querySelectorAll('.history')[0].querySelector('.search')).to.exist;
        expect($cliqzResults.querySelectorAll('.history')[1]
          .querySelector(`.flight .result[data-url="${results[0].url}"]`)).to.exist;
        expect($cliqzResults.querySelectorAll('.history')[2].querySelector(`.result[data-url="${url}"]`)).to.exist;
        expect($cliqzResults.querySelectorAll('.history')[3].querySelector('.result.sessions')).to.exist;
      });

      it('result and flight result were not rendered as backend result', function () {
        expect($cliqzResults.querySelectorAll(`.result[data-url="${results[0].url}"]`))
          .to.have.length(1);
        expect($cliqzResults.querySelectorAll(`.result[data-url="${url}"]`))
          .to.have.length(1);
      });
    });
  });
}
