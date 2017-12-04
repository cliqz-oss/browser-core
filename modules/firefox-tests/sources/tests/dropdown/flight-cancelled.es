/* global it, expect, respondWith, fillIn, waitForPopup, getComputedStyle,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-undef: 'off'*/

import results from './fixtures/resultsFlightCancelled';

export default function () {
  context('for flight results when flight has been cancelled', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    const flightAreaSelector = 'div.flight-details';
    const red = 'rgb(217, 85, 89)';
    const black = 'rgb(0, 0, 0)';
    const grey = 'rgb(51, 51, 51)';
    let resultElement;
    let flightParentItem;

    before(function () {
      respondWith({ results });
      fillIn('flug 9k1870');
      window.preventRestarts = true;
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        flightParentItem = resultElement.querySelector(flightAreaSelector)
          .closest('div.result');
      });
    });

    after(function () {
      window.preventRestarts = false;
    });

    it('renders existing and correct flight header element', function () {
      const flightHeaderItem = flightParentItem.querySelector('div.header');
      chai.expect(flightHeaderItem).to.exist;
      chai.expect(flightHeaderItem).to.contain.text(results[0].snippet.extra.flight_name);
    });

    it('renders flight info area', function () {
      const flightDetailsItem = flightParentItem.querySelector(flightAreaSelector);
      chai.expect(flightDetailsItem).to.exist;
    });

    it('renders existing and correct flight status', function () {
      const flightStatusSelector = 'div.flight-status span';
      const flightStatusItems = flightParentItem.querySelectorAll(flightStatusSelector);
      chai.expect(flightStatusItems.length).to.equal(2);
      chai.expect(flightStatusItems[0]).to.have.text(results[0].snippet.extra.status);
      chai.expect(getComputedStyle(flightStatusItems[0]).color).to.contain(red);
      chai.expect(flightStatusItems[1]).to.contain.text(results[0].snippet.extra.status_detail);
    });

    it('renders existing and correct airplane icon', function () {
      const flightPlaneSelector = 'div.flight-progress-bar';
      const flightPlaneItem = flightParentItem.querySelector(flightPlaneSelector);
      chai.expect(flightPlaneItem).to.exist;
      chai.expect(getComputedStyle(flightPlaneItem).backgroundImage)
        .to.contain('plane-red-outline.svg');
    });

    it('renders existing and correct source label with correct URL', function () {
      const flightSourceSelector = 'p.flight-timestamp span';
      const flightSourceItem = flightParentItem.querySelector(flightSourceSelector);
      const flightSourceLink = flightSourceItem.querySelector('a');
      chai.expect(flightSourceItem).to.exist;
      chai.expect(flightSourceItem).to.contain.text(locale.source.message);
      chai.expect(flightSourceLink).to.contain.text('flightstats.com');
      chai.expect(flightSourceLink.href).to.contain(results[0].url);
      chai.expect(flightSourceItem).to.contain.text(locale.updated.message);
    });

    ['depart', 'arrival'].forEach(function (flight, i) {
      context(`for ${flight} info`, function () {
        const terminalLabelSelector = `div.depart-arrival div.${flight} div.bold`;
        let terminalLabelItem;
        const timeColor = grey;

        beforeEach(function () {
          terminalLabelItem = flightParentItem.querySelector(terminalLabelSelector);
        });

        it('renders existing and correct airport code', function () {
          const flightDepAirportSelector = `span.${flight}-city`;
          const flightDepAirportItem = flightParentItem.querySelector(flightDepAirportSelector);
          chai.expect(flightDepAirportItem).to.exist;
          chai.expect(flightDepAirportItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_short_name);
          chai.expect(getComputedStyle(flightDepAirportItem).color).to.contain(black);
        });

        it('renders existing and correct full airport name', function () {
          const flightAirportNameSelector = `div.depart-arrival div.${flight} div`;
          const flightAirportNameItem = flightParentItem.querySelector(flightAirportNameSelector);
          chai.expect(flightAirportNameItem).to.exist;
          chai.expect(flightAirportNameItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_name);
        });

        it('renders existing and correct "terminal" / "gate" info', function () {
          chai.expect(terminalLabelItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal_full);
          chai.expect(terminalLabelItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate_full);
        });

        it(`renders existing and correct ${flight} times`, function () {
          const flightEstTimeSelector = `div.depart-arrival div.${flight} span.estimate-${flight}-time`;
          const flightActTimeSelector = `div.depart-arrival div.${flight} span.${flight}-time`;
          const flightEstTimeItem = flightParentItem.querySelector(flightEstTimeSelector);
          const flightActTimeItem = flightParentItem.querySelector(flightActTimeSelector);
          chai.expect(flightEstTimeItem).not.to.exist;
          chai.expect(flightActTimeItem).to.exist;
          chai.expect(getComputedStyle(flightActTimeItem).color).to.contain(timeColor);
          chai.expect(flightActTimeItem.className).to.not.contain('strike-through');
        });
      });
    });
  });
}
