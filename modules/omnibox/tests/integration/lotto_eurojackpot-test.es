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
import results from '../../core/integration/fixtures/resultsLottoEurojackpot';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';
  const lottoResultSelector = '.lotto';
  const rowSelector = '.row';
  const elementSelector = '.item';
  const labelSelector = '.description';

  context('for lotto Eurojackpot rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('eurojackpot');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, isPresent: true });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
    checkLotto({ $result: $cliqzResults, amountOfRows: 2 });

    describe('renders 5 aus 50 results', function () {
      it('with a correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus50 = $allLottoRows[0];
        const $all5Aus50Elements = $aus50.querySelectorAll(elementSelector);

        expect($all5Aus50Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen.length);
      });

      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus50 = $allLottoRows[0];
        const $allAus50Elements = $aus50.querySelectorAll(elementSelector);

        expect($allAus50Elements.length).to.be.above(0);
        [...$allAus50Elements].forEach(function (element, i) {
          expect(element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.ej.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus50 = $allLottoRows[0];
        const $aus50Label = $aus50.querySelector(labelSelector);

        expect($aus50Label).to.exist;
        expect($aus50Label).to.have.text('5 aus 50');
      });
    });

    describe('renders 2 aus 10 results', function () {
      it('with correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus10 = $allLottoRows[1];
        const $all2Aus10Elements = $aus10.querySelectorAll(elementSelector);

        expect($all2Aus10Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht.length);
      });

      it('with correct value of numerical elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus10 = $allLottoRows[1];
        const $all2Aus10Elements = $aus10.querySelectorAll(elementSelector);

        expect($all2Aus10Elements.length).to.be.above(0);
        [...$all2Aus10Elements].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.ej.zwei_aus_acht[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus10 = $allLottoRows[1];
        const $aus10Label = $aus10.querySelector(labelSelector);

        expect($aus10Label).to.exist;
        expect($aus10Label).to.have.text('2 aus 10');
      });
    });
  });
}
