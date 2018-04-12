import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  getLocaliseString,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsCurrencyConverter';

export default function () {
  describe('currency converter', function () {
    context('simple: 1 euro to usd', function () {
      let $resultElement;

      before(function () {
        blurUrlBar();
        respondWith({ results });
        withHistory([]);
        fillIn('1 euro to usd');
        return waitForPopup().then(function () {
          const resultsContainer = $cliqzResults()[0];
          $resultElement = resultsContainer.querySelector('.currency');
        });
      });

      it('renders correct result', function () {
        const titleSelector = '.title';
        const extra = results[0].snippet.extra;
        expect($resultElement).to.contain(titleSelector);
        const answer = extra.toAmount.main;
        const toCurrency = extra.toCurrencyName || extra.toCurrency;
        expect($resultElement).to.contain(titleSelector)
          .to.have.text(`= ${answer} ${toCurrency}`);
      });

      it('renders correct subtitle', function () {
        const subtitleSelector = '.subtitle';
        expect($resultElement).to.contain(subtitleSelector);
        const fromCurrency = results[0].snippet.extra.fromCurrency;
        const toCurrency = results[0].snippet.extra.toCurrency;
        const conversion = results[0].snippet.extra.mConversionRate;
        const noGuarantee = getLocaliseString({
          de: 'Ohne Gewähr',
          default: 'without guarantee'
        });
        expect($resultElement.querySelector(subtitleSelector).textContent.trim().split('\n')[0].trim())
          .to.equal(`1 ${fromCurrency} = ${conversion} ${toCurrency} ${noGuarantee}`);
      });

      it('renders source', function () {
        const subtitleSelector = '.subtitle';
        expect($resultElement).to.contain(subtitleSelector);
        const source = getLocaliseString({
          de: 'Quelle',
          default: 'Source'
        });
        expect($resultElement.querySelector(subtitleSelector).textContent.trim().split('\n')[1].trim())
          .to.equal(`· ${source}: xe.com`);
      });

      it('source link is correct', function () {
        const sourceSelector = '.source-link';
        expect($resultElement).to.contain(sourceSelector);
        expect($resultElement.querySelector('.source-link').dataset.url).to.equal(results[0].url);
      });
    });
  });
}
