import {
  closeTab,
  expect,
  getLocalisedString,
  newTab,
  queryComputedStyle,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

// When mobile-cards results have the same logic as dropdown
// import the flightMatrix from flight-helpers
import {
  colors,
  flightMatrix,
} from '../../core/integration/flight-helpers-mobile';

import {
  cardsUrl,
  checkComplementarySearchCard,
  checkHeader,
  checkMainUrl,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import resultsFlights from '../../../tests/core/integration/fixtures/resultsFlights';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  Object.keys(flightMatrix).forEach((flightType) => {
    describe(`for a flight mobile cards result when plane ${flightMatrix[flightType].name}`, function () {
      let id;
      let results;

      before(async function () {
        win.preventRestarts = true;

        results = resultsFlights[flightType];
        id = await newTab(cardsUrl);
        withHistory([]);
        await mockSearch({ results });
        win.CLIQZ.app.modules.search.action('startSearch', 'flug lx3029', { tab: { id } });
        await waitForElement({
          url: cardsUrl,
          selector: '[aria-label="mobile-result"]',
          isPresent: true
        });
      });

      after(async function () {
        await closeTab(id);
        win.preventRestarts = false;
        win.CLIQZ.app.modules.search.action('stopSearch');
      });

      checkMainUrl({ url: cardsUrl, mainUrl: resultsFlights[flightType][0].url });
      checkHeader({ url: cardsUrl, results: resultsFlights[flightType], imageName: 'flightstats' });

      it('renders correct flight title', async function () {
        const $titles = await getElements({
          elementSelector: '[aria-label="flight-title"]',
          url: cardsUrl,
        });

        expect($titles).to.have.length(1);
        expect($titles[0].textContent).to.equal(results[0].snippet.extra.flight_name);
      });

      it('renders correct flight status', async function () {
        const $status = await getElements({
          elementSelector: '[aria-label="flight-status"]',
          url: cardsUrl,
        });
        const $statusStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-status"');

        expect($status).to.have.length(1);
        expect($status[0].textContent.toLowerCase())
          .to.equal(results[0].snippet.extra.status.toLowerCase());

        expect($statusStyle[0].backgroundColor).to.equal(flightMatrix[flightType].statusColor);
      });

      it('renders correct small time status', async function () {
        const $smallActualTime = await getElements({
          elementSelector: '[aria-label="flight-actual-time-small"]',
          url: cardsUrl,
        });
        const $smallEstimatedTime = await getElements({
          elementSelector: '[aria-label="flight-estimated-time-small"]',
          url: cardsUrl,
        });
        const $smallActualTimeStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-actual-time-small"] div');

        expect($smallActualTime).to.have.length(1);
        expect($smallActualTime[0].textContent)
          .to.contain(results[0].snippet.extra.depart_arrive[0].scheduled_time);
        expect($smallActualTime[0].textContent)
          .to.contain(results[0].snippet.extra.depart_arrive[1].scheduled_time);

        expect($smallActualTimeStyle[0].color).to.equal(colors.grey);

        if (
          flightMatrix[flightType].arrival.estimate.isShown === true
          || flightMatrix[flightType].depart.estimate.isShown === true
        ) {
          expect($smallActualTimeStyle[0].textDecoration).to.equal('line-through');

          expect($smallEstimatedTime).to.have.length(1);
          expect($smallEstimatedTime[0].textContent)
            .to.contain(results[0].snippet.extra.depart_arrive[0].estimate_actual_time);
          expect($smallEstimatedTime[0].textContent)
            .to.contain(results[0].snippet.extra.depart_arrive[1].estimate_actual_time);

          const $smallEstimatedTimeStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-estimated-time-small"] div');
          expect($smallEstimatedTimeStyle[0].color).to.equal(flightMatrix[flightType].statusColor);
        } else {
          expect($smallActualTimeStyle[0].textDecoration).to.not.equal('line-through');
          expect($smallEstimatedTime).to.have.length(0);
        }
      });

      it('renders existing flight update', async function () {
        const $updates = await getElements({
          elementSelector: '[aria-label="flight-updated"]',
          url: cardsUrl,
        });
        const updateString = flightType === 'cancelled'
          ? 'mobile_flight_no_updates'
          : 'updated';

        expect($updates).to.have.length(1);
        expect($updates[0].textContent).to.contain(getLocalisedString(updateString));
      });

      it('renders correct airplane icon', async function () {
        const $planeIcons = await getElements({
          elementSelector: '[aria-label="flight-plane-icon"]',
          url: cardsUrl,
        });
        const $planeIconStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-plane-icon"] div div');

        if (flightMatrix[flightType].icon === false) {
          expect($planeIcons).to.have.length(0);
        } else {
          expect($planeIcons).to.have.length(1);
          expect($planeIconStyle[0].backgroundImage).to.contain(`${flightMatrix[flightType].icon}.svg`);
        }
      });

      it('renders correct airport code', function () {
        ['depart', 'arrival'].forEach(async (direction, i) => {
          const $airportCodes = await getElements({
            elementSelector: `[aria-label="flight-${direction}-city"]`,
            url: cardsUrl,
          });
          const $airportCodeStyle = await queryComputedStyle(cardsUrl, `[aria-label="flight-${direction}-city"]`);

          expect($airportCodes).to.have.length(1);
          expect($airportCodes[0].textContent)
            .to.equal(results[0].snippet.extra.depart_arrive[i].location_short_name);
          expect($airportCodeStyle[0].color).to.equal(colors.black);

          // TODO: implement tests when diverted status is available
        });
      });

      it('renders correct departure/arrival airport name and date', async function () {
        const $airportsAndDates = await getElements({
          elementSelector: '[aria-label="flight-city-and-date"]',
          url: cardsUrl,
        });

        expect($airportsAndDates).to.have.length(2);
        [...$airportsAndDates].forEach(($airport, i) => {
          expect($airport.textContent)
            .to.contain(results[0].snippet.extra.depart_arrive[i].location_name);
          expect($airport.textContent)
            .to.contain(results[0].snippet.extra.depart_arrive[i].scheduled_date);
        });
      });

      it('renders correct departure/arrival label', async function () {
        const $directionLabels = await getElements({
          elementSelector: '[aria-label="flight-direction-time-label"]',
          url: cardsUrl,
        });
        const directionString = ['departure', 'landing'];

        expect($directionLabels).to.have.length(2);
        [...$directionLabels].forEach(($direction, i) => {
          expect($direction.textContent).to.contain(getLocalisedString(`mobile_flight_scheduled_${directionString[i]}`));
        });
      });

      it('renders correct departure/arrival time', async function () {
        const $scheduledTimes = await getElements({
          elementSelector: '[aria-label="flight-scheduled-time-big"]',
          url: cardsUrl,
        });
        const $scheduledTimeStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-scheduled-time-big"] div');
        const $actualTimes = await getElements({
          elementSelector: '[aria-label="flight-actual-time-big"]',
          url: cardsUrl,
        });
        const $actualTimeStyle = await queryComputedStyle(cardsUrl, '[aria-label="flight-actual-time-big"] div');

        expect($scheduledTimes).to.have.length(2);
        [...$scheduledTimes].forEach(($scheduled, i) => {
          expect($scheduled.textContent)
            .to.contain(results[0].snippet.extra.depart_arrive[i].scheduled_time);
        });

        expect($scheduledTimeStyle).to.have.length(2);
        [...$scheduledTimeStyle].forEach(($scheduled) => {
          expect($scheduled.color).to.equal(colors.black);
        });

        let actualCount = 0;
        ['depart', 'arrival'].forEach((direction, i) => {
          if (flightMatrix[flightType][direction].estimate.isShown === true) {
            actualCount += 1;
            expect($scheduledTimeStyle[i].textDecoration).to.equal('line-through');
            expect($actualTimeStyle[i].color)
              .to.equal(flightMatrix[flightType][direction].actual.color);
          } else {
            expect($scheduledTimeStyle[i].textDecoration).to.not.equal('line-through');
          }
        });

        expect($actualTimes).to.have.length(actualCount);
        if ($actualTimes.length > 0) {
          [...$actualTimes].forEach(($actual, i) => {
            expect($actual.textContent)
              .to.contain(results[0].snippet.extra.depart_arrive[i].estimate_actual_time);
          });
        }
        expect($actualTimeStyle).to.have.length(actualCount);
      });

      it('renders correct terminal info', async function () {
        const $terminalLabels = await getElements({
          elementSelector: '[aria-label="flight-terminal-label"]',
          url: cardsUrl,
        });
        const $terminals = await getElements({
          elementSelector: '[aria-label="flight-terminal"]',
          url: cardsUrl,
        });

        expect($terminalLabels).to.have.length(2);
        [...$terminalLabels].forEach(function ($label) {
          expect($label.textContent).to.equal('Terminal');
        });

        expect($terminals).to.have.length(2);
        [...$terminals].forEach(function ($terminal, i) {
          expect($terminal.textContent)
            .to.equal(results[0].snippet.extra.depart_arrive[i].terminal);
        });
      });

      it('renders correct gate info', async function () {
        const $gateLabels = await getElements({
          elementSelector: '[aria-label="flight-gate-label"]',
          url: cardsUrl,
        });
        const $gates = await getElements({
          elementSelector: '[aria-label="flight-gate"]',
          url: cardsUrl,
        });

        expect($gateLabels).to.have.length(2);
        [...$gateLabels].forEach(function ($label) {
          expect($label.textContent).to.equal(getLocalisedString('mobile_flight_gate'));
        });

        expect($gates).to.have.length(2);
        [...$gates].forEach(function ($gate, i) {
          expect($gate.textContent)
            .to.equal(results[0].snippet.extra.depart_arrive[i].gate);
        });
      });

      checkComplementarySearchCard({ url: cardsUrl });
    });
  });
}
