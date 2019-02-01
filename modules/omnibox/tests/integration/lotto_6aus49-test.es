import {
  $cliqzResults,
  blurUrlBar,
  checkButtons,
  checkLotto,
  checkMainResult,
  checkParent,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsLotto6Aus49';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';
  const lottoResultSelector = '.lotto';
  const rowSelector = '.row';
  const elementSelector = '.item';
  const superZahlLabelSelector = '.description';

  context('for lotto 6 Aus 49 rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('6 aus 49');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, isPresent: true });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
    checkLotto({ $result: $cliqzResults, amountOfRows: 3 });

    describe('renders 6 aus 49 results', function () {
      it('with a correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus49 = $allLottoRows[0];
        const $allAus49Elements = $aus49.querySelectorAll(elementSelector);

        expect($allAus49Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen.length + 1);
      });

      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus49 = $allLottoRows[0];
        const $allAus49Elements = $aus49.querySelectorAll(elementSelector);
        const $6Aus49Numbers = [...$allAus49Elements].slice(0, $allAus49Elements.length - 1);

        expect($6Aus49Numbers.length).to.be.above(0);
        [...$6Aus49Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.lotto.gewinnzahlen[i]
          );
        });
      });

      it('with a correct value of Superzahl', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus49 = $allLottoRows[0];
        const $allAus49Elements = $aus49.querySelectorAll(elementSelector);
        const $superZahl = $allAus49Elements[$allAus49Elements.length - 1];

        expect($superZahl).to.contain.text(
          results[0].snippet.extra.lotto_list.cur_date.lotto.superzahl
        );
      });

      it('with a correct label of Superzahl', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $aus49 = $allLottoRows[0];
        const $superZahlLabel = $aus49.querySelector(superZahlLabelSelector);

        expect($superZahlLabel).to.exist;
        expect($superZahlLabel).to.have.text(getLocalisedString('lotto_superzahl'));
      });
    });

    describe('renders Spiel77 results', function () {
      it('with a correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $spiel77 = $allLottoRows[1];
        const $allSpiel77Elements = $spiel77.querySelectorAll(elementSelector);

        expect($allSpiel77Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen.length + 1);
      });

      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $spiel77 = $allLottoRows[1];
        const $allSpiel77Elements = $spiel77.querySelectorAll(elementSelector);
        const $spiel77Numbers = [...$allSpiel77Elements].slice(1);

        expect($spiel77Numbers.length).to.be.above(0);
        [...$spiel77Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.spiel77.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $spiel77 = $allLottoRows[1];
        const $allSpiel77Elements = $spiel77.querySelectorAll(elementSelector);
        const $spiel77Label = [...$allSpiel77Elements][0];

        expect($spiel77Label).to.contain.text('Spiel77');
      });
    });

    describe('renders Super6 results', function () {
      it('with a correct amount of elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $super6 = $allLottoRows[2];
        const $allSuper6Elements = $super6.querySelectorAll(elementSelector);

        expect($allSuper6Elements.length)
          .to.equal(results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen.length + 1);
      });

      it('with a correct value of numerical elements', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $super6 = $allLottoRows[2];
        const $allSuper6Elements = $super6.querySelectorAll(elementSelector);
        const $super6Numbers = [...$allSuper6Elements].slice(1);

        expect($super6Numbers.length).to.be.above(0);
        [...$super6Numbers].forEach(function ($element, i) {
          expect($element).to.contain.text(
            results[0].snippet.extra.lotto_list.cur_date.super6.gewinnzahlen[i]
          );
        });
      });

      it('with a correct label', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $super6 = $allLottoRows[2];
        const $allSuper6Elements = $super6.querySelectorAll(elementSelector);
        const $super6Label = [...$allSuper6Elements][0];

        expect($super6Label).to.contain.text('Super6');
      });
    });
  });
}
