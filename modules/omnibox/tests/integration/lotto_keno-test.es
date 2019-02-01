import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkLotto,
  checkMainResult,
  checkParent,
  expect,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsLottoKeno';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';
  const lottoResultSelector = '.lotto';
  const rowSelector = '.row';
  const elementSelector = '.item';

  context('for lotto Keno rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('keno');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, isPresent: true });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
    checkLotto({ $result: $cliqzResults, amountOfRows: 3 });

    describe('renders Keno results', function () {
      it('with a correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);

        [0, 1].forEach(function (row) {
          const $kenoResults = $allLottoRows[row].querySelectorAll(elementSelector);
          expect($kenoResults.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen.length / 2);
        });
      });

      it('with correct value of numerical elelements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);

        [0, 1].forEach(function (row) {
          const $kenoResults = $allLottoRows[row].querySelectorAll(elementSelector);

          expect($kenoResults.length).to.be.above(0);
          [...$kenoResults].forEach(function (element, i) {
            let idx;
            if (row === 0) { idx = i; } else { idx = i + 10; }

            expect(element).to.contain.text(
              results[0].snippet.extra.lotto_list.cur_date.keno.gewinnzahlen[idx]
            );
          });
        });
      });
    });

    describe('renders plus5 results', function () {
      it('with correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $allPlus5Elements = $allLottoRows[2].querySelectorAll(elementSelector);

        expect($allPlus5Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.plus5.gewinnzahlen.length + 1);
      });

      it('with correct value of numerical elelements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $allPlus5Elements = $allLottoRows[2].querySelectorAll(elementSelector);
        const $plus5Numbers = [...$allPlus5Elements].slice(1);

        expect($plus5Numbers.length).to.be.above(0);
        [...$plus5Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.plus5.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $allPlus5Elements = $allLottoRows[2].querySelectorAll(elementSelector);
        const $plus5Label = $allPlus5Elements[0];

        expect($plus5Label).to.contain.text('plus5');
      });
    });
  });
}
