import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  expect,
  fillIn,
  getComputedStyle,
  getLocalisedString,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import { colors, flightMatrix } from '../../core/integration/flight-helpers';
import resultsFlights from '../../core/integration/fixtures/resultsFlights';

export default function () {
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
        await blurUrlBar();
        withHistory([]);
        results = resultsFlights[flightType];
        await mockSearch({ results });
        fillIn('flug lx3029');
        win.preventRestarts = true;
        await waitForPopup(1);
      });

      after(function () {
        win.preventRestarts = false;
      });

      checkMainResult({ $result: $cliqzResults });

      it('renders correct flight header element', async function () {
        const $flightHeader = await $cliqzResults.querySelector(flightHeaderSelector);

        expect($flightHeader).to.exist;
        expect($flightHeader).to.contain.text(results[0].snippet.extra.flight_name);
      });

      it('renders flight info area', async function () {
        const $flightArea = await $cliqzResults.querySelector(flightAreaSelector);
        expect($flightArea).to.exist;
      });

      it('renders correct flight status', async function () {
        const $flightStatusText = await $cliqzResults
          .querySelector(`${flightAreaSelector} ${flightStatusTextSelector}`);
        const $flightStatusDetail = await $cliqzResults
          .querySelector(`${flightAreaSelector} ${flightStatusDetailSelector}`);

        expect($flightStatusText).to.exist;
        expect($flightStatusText).to.have.text(results[0].snippet.extra.status);
        expect(await getComputedStyle($flightStatusText, 'color'))
          .to.contain(flightMatrix[flightType].statusColor);

        if ($flightStatusDetail) {
          expect($flightStatusDetail).to.contain.text(results[0].snippet.extra.status_detail);
        }
      });

      it('renders correct airplane icon', async function () {
        const $planeIcon = await $cliqzResults.querySelector(planeIconSelector);

        expect($planeIcon).to.exist;

        if (flightMatrix[flightType].icon === false) {
          expect(await getComputedStyle($planeIcon, 'backgroundImage')).to.contain('none');
        } else {
          expect(await getComputedStyle($planeIcon, 'backgroundImage'))
            .to.contain(`${flightMatrix[flightType].icon}.svg`);
        }
      });

      it('renders correct source label with correct URL', async function () {
        const $sourceArea = await $cliqzResults.querySelector(sourceAreaSelector);
        const $sourceLabel = await $cliqzResults
          .querySelector(`${sourceAreaSelector} ${sourceLabelSelector}`);
        const $sourceLink = await $cliqzResults
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

          it('renders correct airport codes', async function () {
            const airportCodeSelector = `.${direction}-city`;
            const actualAirportCodeSelector = `.actual-${direction}-city`;
            const $airportCode = await $cliqzResults
              .querySelector(`${flightAreaSelector} ${airportCodeSelector}`);
            const $actualAirportCode = await $cliqzResults
              .querySelector(`${flightAreaSelector} ${actualAirportCodeSelector}`);

            expect($airportCode).to.exist;
            expect($airportCode)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_short_name);
            expect(await getComputedStyle($airportCode, 'color')).to.contain(colors.black);

            if ((direction === 'arrival') && (flightType === 'diverted')) {
              expect($airportCode.className).to.contain('strike-through');
              expect($actualAirportCode).to.exist;
              expect($actualAirportCode.className).to.not.contain('strike-through');
              expect($actualAirportCode.textContent.trim().length).to.not.equal(0);
              expect(await getComputedStyle($actualAirportCode, 'color')).to.contain(colors.red);
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

          it('renders existing and correct full airport name', async function () {
            const $airportName = await $cliqzResults
              .querySelector(`${flightAreaSelector} ${departAndArrivalInfoAreaSelector} ${airportNameSelector}`);

            expect($airportName).to.exist;
            expect($airportName)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_name);
            expect(await getComputedStyle($airportName, 'color')).to.contain(colors.blackish);
          });

          it('renders existing and correct "terminal" / "gate" info', async function () {
            const $terminalAndGateLabel = await $cliqzResults.querySelector(`${flightAreaSelector} ${terminalAndGateLabelSelector}`);

            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal_full);
            expect($terminalAndGateLabel)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate_full);
          });

          it(`renders existing and correct ${direction} times`, async function () {
            const $estimateTime = await $cliqzResults
              .querySelector(`${departAndArrivalInfoAreaSelector} ${estimateTimeSelector}`);
            const $actualTime = await $cliqzResults
              .querySelector(`${departAndArrivalInfoAreaSelector} ${actualTimeSelector}`);

            if (flightMatrix[flightType][direction].estimate.isShown === true) {
              expect($estimateTime).to.exist;
              expect($estimateTime.textContent.trim().length).to.not.equal(0);
              expect(await getComputedStyle($estimateTime, 'color'))
                .to.contain(flightMatrix[flightType][direction].estimate.color);
              expect($estimateTime.className).to.contain('strike-through');
            } else {
              expect($estimateTime).to.not.exist;
            }

            expect($actualTime).to.exist;
            expect($actualTime.textContent.trim().length).to.not.equal(0);
            expect(await getComputedStyle($actualTime, 'color'))
              .to.contain(flightMatrix[flightType][direction].actual.color);
            expect($actualTime.className).to.not.contain('strike-through');
          });
        });
      });
    });
  });
}
