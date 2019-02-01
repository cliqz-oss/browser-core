import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsCurrencyConverter';

export default function () {
  const resultsContainerSelector = '.currency';
  const titleSelector = '.title';
  const subtitleSelector = '.subtitle';
  const sourceSelector = '.source-link';

  describe('currency converter', function () {
    context('simple: 1 euro to usd', function () {
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('1 euro to usd');
        await waitForPopup(1);
      });

      after(function () {
        win.preventRestarts = false;
      });

      checkMainResult({ $result: $cliqzResults });

      it('renders correct result', async function () {
        const extra = results[0].snippet.extra;
        const answer = extra.toAmount.main;
        const toCurrency = extra.toCurrency;
        const toCurrencyName = extra.toCurrencyName ? ` (${extra.toCurrencyName})` : '';

        expect(await $cliqzResults
          .querySelector(`${resultsContainerSelector} ${titleSelector}`))
          .to.exist;

        expect(await $cliqzResults
          .querySelector(`${resultsContainerSelector} ${titleSelector}`))
          .to.contain.text(`= ${answer} ${toCurrency}${toCurrencyName}`);
      });

      it('renders correct subtitle', async function () {
        const fromCurrency = results[0].snippet.extra.fromCurrency;
        const toCurrency = results[0].snippet.extra.toCurrency;
        const conversion = results[0].snippet.extra.mConversionRate;
        const noGuarantee = getLocalisedString('no_legal_disclaimer');
        const $subtitle = await $cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`);

        expect($subtitle).to.exist;
        expect($subtitle.textContent.trim().split('\n')[0].trim())
          .to.equal(`1 ${fromCurrency} = ${conversion} ${toCurrency} ${noGuarantee}`);
      });

      it('renders correct source', async function () {
        const source = getLocalisedString('source');
        const $subtitle = await $cliqzResults
          .querySelector(`${resultsContainerSelector} ${subtitleSelector}`);

        expect($subtitle).to.exist;
        expect($subtitle.textContent.trim().split('\n')[1].trim())
          .to.equal(`· ${source}: xe.com`);
      });

      it('renders correct source URL', async function () {
        const $source = await $cliqzResults
          .querySelector(`${resultsContainerSelector} ${sourceSelector}`);
        expect($source.href).to.exist;
        expect($source.href).to.equal(results[0].url);
      });
    });
  });
}
