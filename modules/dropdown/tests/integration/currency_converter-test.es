import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  testsEnabled,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsCurrencyConverter';

export default function () {
  if (!testsEnabled()) { return; }

  const resultsContainerSelector = '.currency';
  const titleSelector = '.title';
  const subtitleSelector = '.subtitle';
  const sourceSelector = '.source-link';

  describe('currency converter', function () {
    context('simple: 1 euro to usd', function () {
      before(async function () {
        win.preventRestarts = true;
        blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('1 euro to usd');
        await waitForPopup(2);
      });

      after(function () {
        win.preventRestarts = false;
      });

      checkMainResult({ $result: $cliqzResults });

      it('renders correct result', function () {
        const extra = results[0].snippet.extra;
        const answer = extra.toAmount.main;
        const toCurrency = extra.toCurrency;
        const toCurrencyName = extra.toCurrencyName ? ` (${extra.toCurrencyName})` : '';

        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${titleSelector}`))
          .to.exist;

        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${titleSelector}`))
          .to.contain.text(`= ${answer} ${toCurrency}${toCurrencyName}`);
      });

      it('renders correct subtitle', function () {
        const fromCurrency = results[0].snippet.extra.fromCurrency;
        const toCurrency = results[0].snippet.extra.toCurrency;
        const conversion = results[0].snippet.extra.mConversionRate;
        const noGuarantee = getLocalisedString('no_legal_disclaimer');

        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`))
          .to.exist;

        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`)
          .textContent.trim().split('\n')[0].trim())
          .to.equal(`1 ${fromCurrency} = ${conversion} ${toCurrency} ${noGuarantee}`);
      });

      it('renders correct source', function () {
        const source = getLocalisedString('source');

        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`))
          .to.exist;
        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`)
          .textContent.trim().split('\n')[1].trim())
          .to.equal(`· ${source}: xe.com`);
      });

      it('renders correct source URL', function () {
        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${sourceSelector}`).href)
          .to.exist;
        expect($cliqzResults
          .querySelector(`${resultsContainerSelector} ${sourceSelector}`).href)
          .to.equal(results[0].url);
      });
    });
  });
}
