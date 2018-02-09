/* global window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import { expect, withHistory, respondWith, getComputedStyle,
  fillIn, waitForPopup, $cliqzResults, CliqzUtils } from './helpers';
import { colors, flightMatrix } from './flight-helpers';
import resultsFlights from './fixtures/resultsFlights';

export default function () {
  Object.keys(flightMatrix).forEach(function (flightType) {
    context(`for flight results when plane ${flightMatrix[flightType].name}`, function () {
      const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
      const flightDetailsAreaSelector = 'div.flight-details';
      let results;
      let resultElement;
      let $flightResult;

      beforeEach(function () {
        withHistory([]);
        results = resultsFlights[flightType];
        respondWith({ results });
        fillIn('flug lx3029');
        window.preventRestarts = true;
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
          $flightResult = resultElement.querySelector(flightDetailsAreaSelector)
            .closest('div.result');
        });
      });

      afterEach(function () {
        window.preventRestarts = false;
      });

      it('renders existing and correct flight header element', function () {
        const $flightHeader = $flightResult.querySelector('div.header');
        expect($flightHeader).to.exist;
        expect($flightHeader).to.contain.text(results[0].snippet.extra.flight_name);
      });

      it('renders flight info area', function () {
        const $flightDetailsArea = $flightResult.querySelector(flightDetailsAreaSelector);
        expect($flightDetailsArea).to.exist;
      });

      it('renders existing and correct flight status', function () {
        const flightStatusSelector = 'div.flight-status span';
        const $flightStatuses = $flightResult.querySelectorAll(flightStatusSelector);
        expect($flightStatuses[0]).to.have.text(results[0].snippet.extra.status);
        expect(getComputedStyle($flightStatuses[0]).color)
          .to.contain(flightMatrix[flightType].statusColor);
        if ($flightStatuses.length === 2) {
          expect($flightStatuses[1]).to.contain.text(results[0].snippet.extra.status_detail);
        }
      });

      it('renders existing and correct airplane icon', function () {
        const flightPlaneIconSelector = 'div.flight-progress-bar';
        const $flightPlaneIcon = $flightResult.querySelector(flightPlaneIconSelector);

        expect($flightPlaneIcon).to.exist;

        if (flightMatrix[flightType].icon === false) {
          expect(getComputedStyle($flightPlaneIcon).backgroundImage).to.contain('none');
        } else {
          expect(getComputedStyle($flightPlaneIcon).backgroundImage)
            .to.contain(`${flightMatrix[flightType].icon}.svg`);
        }
      });

      it('renders existing and correct source label with correct URL', function () {
        const flightSourceSelector = 'p.flight-timestamp span';
        const $flightSource = $flightResult.querySelector(flightSourceSelector);
        const $flightSourceUrl = $flightSource.querySelector('a');
        expect($flightSource).to.exist;
        expect($flightSource).to.contain.text(locale.source.message);
        expect($flightSourceUrl).to.contain.text('flightstats.com');
        expect($flightSourceUrl.href).to.contain(results[0].url);
        expect($flightSource).to.contain.text(locale.updated.message);
      });

      ['depart', 'arrival'].forEach(function (direction, i) {
        context(`for ${direction} info`, function () {
          const terminalAndGateLabelSelector = `div.depart-arrival div.${direction} div.bold`;
          let $terminalAndGateLabel;

          beforeEach(function () {
            $terminalAndGateLabel = $flightResult.querySelector(terminalAndGateLabelSelector);
          });

          it('renders correct airport codes', function () {
            const airportCodeSelector = `span.${direction}-city`;
            const actualAirportCodeSelector = `span.actual-${direction}-city`;
            const $airportCode = $flightResult.querySelector(airportCodeSelector);
            const $actualAirportCode = $flightResult.querySelector(actualAirportCodeSelector);

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
            const airportNameSelector = `div.depart-arrival div.${direction} div`;
            const $airportName = $flightResult.querySelector(airportNameSelector);
            expect($airportName).to.exist;
            expect($airportName)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_name);
            expect(getComputedStyle($airportName).color).to.contain(colors.blackish);
          });

          it('renders existing and correct "terminal" / "gate" info', function () {
            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal_full);
            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate_full);
          });

          it(`renders existing and correct ${direction} times`, function () {
            const estimateTimeSelector = `div.depart-arrival div.${direction} span.estimate-${direction}-time`;
            const actualTimeSelector = `div.depart-arrival div.${direction} span.${direction}-time`;
            const $estimateTime = $flightResult.querySelector(estimateTimeSelector);
            const $actualTime = $flightResult.querySelector(actualTimeSelector);

            if (flightMatrix[flightType][direction].estimate.isShown === true) {
              expect($estimateTime).to.exist;
              expect($estimateTime.textContent.trim().length).to.not.equal(0);
              expect(getComputedStyle($estimateTime).color)
                .to.contain(flightMatrix[flightType][direction].estimate.color);
              expect($estimateTime.className).to.contain('strike-through');
            } else {
              expect($estimateTime).to.not.exist;
              // expect($estimateTime.textContent.trim().length).to.equal(0);
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
