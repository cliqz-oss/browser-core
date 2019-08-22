/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
import results from '../../core/integration/fixtures/resultsLottoGluecksspirale';

export default function () {
  const mainResultSelector = '.cliqz-result:not(.history)';
  const lottoResultSelector = '.lotto';
  const rowSelector = '.row';
  const elementSelector = '.item';
  const classSelector = '.description';

  context('for lotto Gluecksspirale rich header', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('gluecksspirale');
      await waitForPopup(1);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, isPresent: true });
    checkParent({ $result: $cliqzResults, results });
    checkButtons({ $result: $cliqzResults, results });
    checkLotto({
      $result: $cliqzResults,
      amountOfRows: results[0].snippet.extra.lotto_list.cur_date.gs.gewinnzahlen[6].length
    });

    describe('each Lotto row result', function () {
      it('renders with a correct amount of number squares', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);

        expect($allLottoRows.length).to.be.above(0);
        [...$allLottoRows].forEach(function ($row, i) {
          const $allRowElements = $row.querySelectorAll(elementSelector);

          expect($allRowElements.length)
            .to.equal(results[0].snippet.extra.lotto_list.cur_date.gs.gewinnzahlen[6][i].length);
        });
      });

      it('renders with correct results', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);

        expect($allLottoRows.length).to.be.above(0);
        [...$allLottoRows].forEach(function ($row, i) {
          const $allRowElements = $row.querySelectorAll(elementSelector);

          expect($allRowElements.length).to.be.above(0);
          [...$allRowElements].forEach(function ($element, j) {
            expect($element)
              .to.contain.text(results[0].snippet.extra
                .lotto_list.cur_date.gs.gewinnzahlen[6][i][j]);
          });
        });
      });

      it('with correct winning classes', async function () {
        const $allLottoRows = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);
        const $classes = await $cliqzResults
          .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${classSelector}`);

        expect($classes.length).to.be.above(0);
        expect($classes.length).to.equal($allLottoRows.length);

        [...$classes].forEach(function ($cl) {
          expect($cl).to.have.text('Gewinnklasse 7');
        });
      });
    });
  });
}
