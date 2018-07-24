/* global window */

import {
  blurUrlBar,
  checkMainResult,
  $cliqzResults,
  expect,
  fillIn,
  getComputedStyle,
  getLocalisedString,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from './helpers';
import { colors, flightMatrix } from './flight-helpers';
import resultsFlights from './fixtures/resultsFlights';

export default function () {
  if (!testsEnabled()) { return; }

  Object.keys(flightMatrix).forEach(function (flightType) {
    context(`for flight results when plane ${flightMatrix[flightType].name}`, function () {
      const flightAreaSelector = '.flight-details';
      const flightHeaderSelector = '.header';
      const flightStatusTextSelector = '.flight-status .flight-status-text';
      const flightStatusDetailSelector = '.flight-status .flight-status-detail';
      const planeIconSelector = '.flight-progress-bar';
      const sourceAreaSelector = '.flight-timestamp';
      const sourceLabelSelector = '.flight-timestamp-label';
      const sourceLinkSelector = '.source-link';
      let results;

      before(async function () {
        blurUrlBar();
        withHistory([]);
        results = resultsFlights[flightType];
        await mockSearch({ results });
        fillIn('flug lx3029');
        window.preventRestarts = true;
        await waitForPopup(2);
      });

      after(function () {
        window.preventRestarts = false;
      });

      checkMainResult({ $result: $cliqzResults });

      it('renders correct flight header element', function () {
        const $flightHeader = $cliqzResults.querySelector(flightHeaderSelector);

        expect($flightHeader).to.exist;
        expect($flightHeader).to.contain.text(results[0].snippet.extra.flight_name);
      });

      it('renders flight info area', function () {
        const $flightArea = $cliqzResults.querySelector(flightAreaSelector);
        expect($flightArea).to.exist;
      });

      it('renders correct flight status', function () {
        const $flightStatusText = $cliqzResults
          .querySelector(`${flightAreaSelector} ${flightStatusTextSelector}`);
        const $flightStatusDetail = $cliqzResults
          .querySelector(`${flightAreaSelector} ${flightStatusDetailSelector}`);

        expect($flightStatusText).to.exist;
        expect($flightStatusText).to.have.text(results[0].snippet.extra.status);
        expect(getComputedStyle($flightStatusText).color)
          .to.contain(flightMatrix[flightType].statusColor);

        if ($flightStatusDetail) {
          expect($flightStatusDetail).to.contain.text(results[0].snippet.extra.status_detail);
        }
      });

      it('renders correct airplane icon', function () {
        const $planeIcon = $cliqzResults.querySelector(planeIconSelector);

        expect($planeIcon).to.exist;

        if (flightMatrix[flightType].icon === false) {
          expect(getComputedStyle($planeIcon).backgroundImage).to.contain('none');
        } else {
          expect(getComputedStyle($planeIcon).backgroundImage)
            .to.contain(`${flightMatrix[flightType].icon}.svg`);
        }
      });

      it('renders correct source label with correct URL', function () {
        const $sourceArea = $cliqzResults.querySelector(sourceAreaSelector);
        const $sourceLabel = $cliqzResults
          .querySelector(`${sourceAreaSelector} ${sourceLabelSelector}`);
        const $sourceLink = $cliqzResults
          .querySelector(`${sourceAreaSelector} ${sourceLinkSelector}`);

        expect($sourceArea).to.exist;

        expect($sourceLabel).to.exist;
        expect($sourceLabel).to.contain.text(getLocalisedString('source'));
        expect($sourceLabel).to.contain.text(getLocalisedString('updated'));

        expect($sourceLink).to.exist;
        expect($sourceLink).to.contain.text('flightstats.com');
        expect($sourceLink.href).to.exist;
        expect($sourceLink.href).to.contain(results[0].url);
      });

      ['depart', 'arrival'].forEach(function (direction, i) {
        context(`${direction} info`, function () {
          const departAndArrivalInfoAreaSelector = '.depart-arrival';
          const terminalAndGateLabelSelector = `.${direction} > .bold`;
          const airportNameSelector = `.${direction} .${direction}-location`;
          const estimateTimeSelector = `.${direction} .estimate-${direction}-time`;
          const actualTimeSelector = `.${direction} .${direction}-time`;

          it('renders correct airport codes', function () {
            const airportCodeSelector = `.${direction}-city`;
            const actualAirportCodeSelector = `.actual-${direction}-city`;
            const $airportCode = $cliqzResults
              .querySelector(`${flightAreaSelector} ${airportCodeSelector}`);
            const $actualAirportCode = $cliqzResults
              .querySelector(`${flightAreaSelector} ${actualAirportCodeSelector}`);

            expect($airportCode).to.exist;
            expect($airportCode)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_short_name);
            expect(getComputedStyle($airportCode).color).to.contain(colors.black);

            if ((direction === 'arrival') && (flightType === 'diverted')) {
              expect($airportCode.className).to.contain('strike-through');
              expect($actualAirportCode).to.exist;
              expect($actualAirportCode.className).to.not.contain('strike-through');
              expect($actualAirportCode.textContent.trim().length).to.not.equal(0);
              expect(getComputedStyle($actualAirportCode).color).to.contain(colors.red);
              expect($actualAirportCode)
                .to.contain.text(results[0].snippet.extra.depart_arrive[i]
                  .actual_location_short_name);
            } else if ((direction === 'arrival') && (flightType !== 'diverted')) {
              expect($airportCode.className).to.not.contain('strike-through');
              expect($actualAirportCode).to.exist;
              expect($actualAirportCode.textContent.trim().length).to.equal(0);
            } else {
              expect($airportCode.className).to.not.contain('strike-through');
              expect($actualAirportCode).to.not.exist;
            }
          });

          it('renders existing and correct full airport name', function () {
            const $airportName = $cliqzResults
              .querySelector(`${flightAreaSelector} ${departAndArrivalInfoAreaSelector} ${airportNameSelector}`);

            expect($airportName).to.exist;
            expect($airportName)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_name);
            expect(getComputedStyle($airportName).color).to.contain(colors.blackish);
          });

          it('renders existing and correct "terminal" / "gate" info', function () {
            const $terminalAndGateLabel = $cliqzResults.querySelector(`${flightAreaSelector} ${terminalAndGateLabelSelector}`);

            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal_full);
            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate_full);
          });

          it(`renders existing and correct ${direction} times`, function () {
            const $estimateTime = $cliqzResults
              .querySelector(`${departAndArrivalInfoAreaSelector} ${estimateTimeSelector}`);
            const $actualTime = $cliqzResults
              .querySelector(`${departAndArrivalInfoAreaSelector} ${actualTimeSelector}`);

            if (flightMatrix[flightType][direction].estimate.isShown === true) {
              expect($estimateTime).to.exist;
              expect($estimateTime.textContent.trim().length).to.not.equal(0);
              expect(getComputedStyle($estimateTime).color)
                .to.contain(flightMatrix[flightType][direction].estimate.color);
              expect($estimateTime.className).to.contain('strike-through');
            } else {
              expect($estimateTime).to.not.exist;
            }

            expect($actualTime).to.exist;
            expect($actualTime.textContent.trim().length).to.not.equal(0);
            expect(getComputedStyle($actualTime).color)
              .to.contain(flightMatrix[flightType][direction].actual.color);
            expect($actualTime.className).to.not.contain('strike-through');
          });
        });
      });
    });
  });
}
