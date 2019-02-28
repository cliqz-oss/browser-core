import {
  $cliqzResults,
  blurUrlBar,
  dropdownClick,
  expect,
  fillIn,
  getLocalisedString,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsTime';

export default function () {
  context('for time result', function () {
    const timeAreaSelector = '.time';
    const mainCitySelector = '.main-result .main';
    const mainTimeZoneSelector = '.main-result .timezone';
    const timezonesSelector = '.timezone-results';
    const timezoneRowSelector = '.timezone-results-row';
    const showMoreSelector = '.expand-btn';

    context('(interactions) clicking on "Show more" button', function () {
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        withHistory([]);
        await mockSearch({ results });
        fillIn('time berlin');
        await waitForPopup(1);
        await waitFor(async () => {
          const $timeZoneRows = await $cliqzResults.querySelectorAll('.timezone-results-row');
          return $timeZoneRows.length === 3;
        });
        await dropdownClick('.result.expand-btn');
        await waitFor(async () => {
          const $timeZoneRows = await $cliqzResults.querySelectorAll('.timezone-results-row');
          return $timeZoneRows.length > 3;
        });
      });

      after(function () {
        win.preventRestarts = false;
      });

      context('renders main result', function () {
        it('successfully', async function () {
          const $timeArea = await $cliqzResults.querySelector(timeAreaSelector);
          expect($timeArea).to.exist;
        });

        it('with a correct number of expanded table rows', async function () {
          const $allTimezoneRows = await $cliqzResults
            .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);
          expect($allTimezoneRows.length)
            .to.equal(results[0].snippet.extra.time_data.cities_by_tz.length);
        });

        it('without a "Show more" item', async function () {
          const $showMore = await $cliqzResults
            .querySelector(`${timeAreaSelector} ${timezonesSelector} ${showMoreSelector}`);

          expect($showMore).to.not.exist;
        });
      });

      context('each expanded table row', function () {
        it('renders with correct time ', async function () {
          const $allTimezoneRows = await $cliqzResults
            .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

          expect($allTimezoneRows.length).to.be.above(0);
          [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
            const timeSelector = '.main.space';
            const $time = $timezoneRow.querySelector(timeSelector);
            expect($time)
              .to.have.text(results[0].snippet.extra.time_data.cities_by_tz[i].time_info.time);
          });
        });

        it('renders with correct city ', async function () {
          const $allTimezoneRows = await $cliqzResults
            .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

          expect($allTimezoneRows.length).to.be.above(0);
          [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
            const citySelector = '.main.city';
            const $city = $timezoneRow.querySelector(citySelector);
            expect($city)
              .to.have.text(results[0].snippet.extra.time_data.cities_by_tz[i].cities.join(', '));
          });
        });

        it('renders with correct timezone ', async function () {
          const $allTimezoneRows = await $cliqzResults
            .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

          expect($allTimezoneRows.length).to.be.above(0);
          [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
            const timezoneSelector = '.timezone';
            const $timeZone = $timezoneRow.querySelector(timezoneSelector);
            expect($timeZone)
              .to.contain.text(`${results[0].snippet.extra.time_data.cities_by_tz[i].time_info.expression} (${results[0].snippet.extra.time_data.cities_by_tz[i].time_info.tz_info})`);
          });
        });
      });
    });

    context('(UI)', function () {
      before(async function () {
        win.preventRestarts = true;
        await blurUrlBar();
        await mockSearch({ results });
        withHistory([]);
        fillIn('time berlin');
        await waitForPopup(1);
        await waitFor(async () => {
          const timezoneResults = await $cliqzResults.querySelectorAll('.timezone-results-row');
          return timezoneResults.length === 3;
        });
      });

      after(function () {
        win.preventRestarts = false;
      });

      context('renders main result', function () {
        it('successfully', async function () {
          const $timeArea = await $cliqzResults.querySelector(timeAreaSelector);
          expect($timeArea).to.exist;
        });

        it('with correct time and city info', async function () {
          const $mainCity = await $cliqzResults.querySelector(`${timeAreaSelector} ${mainCitySelector}`);

          expect($mainCity).to.exist;
          expect($mainCity)
            .to.have.text(`${results[0].snippet.extra.time_data.main.time} ${results[0].snippet.extra.time_data.main.mapped_location}`);
        });

        it('with correct timezone info', async function () {
          const $mainTimeZone = await $cliqzResults
            .querySelector(`${timeAreaSelector} ${mainTimeZoneSelector}`);

          expect($mainTimeZone).to.exist;
          expect($mainTimeZone)
            .to.have.text(`${results[0].snippet.extra.time_data.main.expression}, ${results[0].snippet.extra.time_data.main.tz_info}`);
        });
      });

      context('renders timezone table', function () {
        it('successfully', async function () {
          const $timezones = await $cliqzResults
            .querySelector(`${timeAreaSelector} ${timezonesSelector}`);
          expect($timezones).to.exist;
        });

        it('with a correct number of table rows', async function () {
          const $allTimezoneRows = await $cliqzResults
            .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);
          expect($allTimezoneRows.length).to.equal(3);
        });

        it('with a correct "Show more" item', async function () {
          const $showMore = await $cliqzResults
            .querySelector(`${timeAreaSelector} ${timezonesSelector} ${showMoreSelector}`);

          expect($showMore).to.exist;
          expect($showMore)
            .to.have.trimmed.text(getLocalisedString('general_expand_button'));
          expect($showMore.dataset.url).to.exist;
        });

        context('each table row', function () {
          it('renders with correct time ', async function () {
            const $allTimezoneRows = await $cliqzResults
              .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

            expect($allTimezoneRows.length).to.be.above(0);
            [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
              const timeSelector = '.main.space';
              const $time = $timezoneRow.querySelector(timeSelector);
              expect($time)
                .to.have.text(results[0].snippet.extra.time_data.cities_by_tz[i].time_info.time);
            });
          });

          it('renders with correct city ', async function () {
            const $allTimezoneRows = await $cliqzResults
              .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

            expect($allTimezoneRows.length).to.be.above(0);
            [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
              const citySelector = '.main.city';
              const $city = $timezoneRow.querySelector(citySelector);
              expect($city)
                .to.have.text(results[0].snippet.extra.time_data.cities_by_tz[i].cities.join(', '));
            });
          });

          it('renders with correct timezone ', async function () {
            const $allTimezoneRows = await $cliqzResults
              .querySelectorAll(`${timeAreaSelector} ${timezonesSelector} ${timezoneRowSelector}`);

            expect($allTimezoneRows.length).to.be.above(0);
            [...$allTimezoneRows].forEach(function ($timezoneRow, i) {
              const timezoneSelector = '.timezone';
              const $timeZone = $timezoneRow.querySelector(timezoneSelector);
              expect($timeZone)
                .to.contain.text(`${results[0].snippet.extra.time_data.cities_by_tz[i].time_info.expression} (${results[0].snippet.extra.time_data.cities_by_tz[i].time_info.tz_info})`);
            });
          });
        });
      });
    });
  });
}
