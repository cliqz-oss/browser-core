/* global it, expect, chai, respondWith, fillIn, waitForPopup,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for flight results without information', function () {
    const results = [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=934356486\u0026airlineCode=SWU\u0026flightNumber=353',
        score: 0,
        snippet: {
          extra: {
            depart_arrive: [
              {
                terminal: '-',
                gate: '-',
                location_name: 'London',
                location_short_name: 'LON',
                time_color: '',
                estimate_actual_date: 'fr.. 22 september',
                estimate_actual_time: '09:15',
              },
              {
                estimate_actual_date: 'fr.. 22 september',
                estimate_actual_time: '11:45',
                terminal: '-',
                gate: '-',
                location_name: 'Genf',
                location_short_name: 'GVA',
                time_color: ''
              }
            ],
            flight_name: 'SWISS Flug 353',
            flight_status: 'no_info',
            plane_icon: '',
            plane_position: '',
            status: 'No information',
            status_color: 'grey',
            status_detail: ''
          },
          friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do'
        },
        type: 'rh',
        subType: {
          class: 'EntityFlight',
          id: '-5358826846182975827',
          name: 'flightStatus'
        },
        template: 'flight',
        trigger_method: 'query'
      }
    ];
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('flug LH8401');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    it('renders an existing and correct header', function () {
      const flightHeaderSelector = 'div.result.instant div.header span.title';
      const flightHeaderItem = resultElement.querySelector(flightHeaderSelector);
      chai.expect(flightHeaderItem).to.exist;
      chai.expect(flightHeaderItem).to.contain.text(results[0].snippet.extra.flight_name);
    });

    it('renders a flight info area', function () {
      const flightDetailsSelector = 'div.result.instant div.flight-details';
      const flightDetailsItem = resultElement.querySelector(flightDetailsSelector);
      chai.expect(flightDetailsItem).to.exist;
    });

    it('renders the "No information" text', function () {
      const flightNoInfoSelector = 'div.flight-details span';
      const flightNoInfoItem = resultElement.querySelector(flightNoInfoSelector);
      chai.expect(flightNoInfoItem).to.have.text(results[0].snippet.extra.status);
    });

    it('renders a flight progress line ', function () {
      const flightProgressSelector = 'div.flight-details div.flight-progress-bar';
      const flightProgressItem = resultElement.querySelector(flightProgressSelector);
      chai.expect(flightProgressItem).to.exist;
    });

    it('does not render a plane icon', function () {
      const win = CliqzUtils.getWindow();
      const flightProgressSelector = 'div.flight-details div.flight-progress-bar';
      // const flightProgressItem = resultElement.querySelector(flightProgressSelector);

      chai.expect(win.getComputedStyle(
        resultElement.querySelector(flightProgressSelector)).backgroundImage)
        .to.contain('none');
    });

    ['depart', 'arrival'].forEach(function (flight, i) {
      context(`for ${flight} info`, function () {
        const flightTerminalSelector = `div.flight-details div.${flight} div.bold`;
        let flightTerminalItem;

        beforeEach(function () {
          flightTerminalItem = resultElement.querySelector(flightTerminalSelector);
        });

        it('renders an existing and correct airport code', function () {
          const flightCodeSelector = `div.flight-details span.${flight}-city`;
          const flightCodeItem = resultElement.querySelector(flightCodeSelector);
          chai.expect(flightCodeItem).to.exist;
          chai.expect(flightCodeItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_short_name);
        });

        it('renders an existing and correct full airport name', function () {
          const flightAirportSelector = `div.flight-details div.${flight} div`;
          const flightAirportItem = resultElement.querySelector(flightAirportSelector);
          chai.expect(flightAirportItem).to.exist;
          chai.expect(flightAirportItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].location_name);
        });

        it('renders existing and correct time', function () {
          const flightTimeSelector = `div.flight-details div.${flight} span.${flight}-time`;
          const flightTimeItem = resultElement.querySelector(flightTimeSelector);
          chai.expect(flightTimeItem).to.exist;
          chai.expect(flightTimeItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].estimate_actual_time);
        });

        it('renders a terminal label and terminal info', function () {
          chai.expect(flightTerminalItem).to.exist;
          chai.expect(flightTerminalItem).to.contain.text(locale.Terminal.message);
          chai.expect(flightTerminalItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal);
        });

        it('renders a gate label and gate info', function () {
          chai.expect(flightTerminalItem).to.exist;
          chai.expect(flightTerminalItem).to.contain.text(locale.Gate.message);
          chai.expect(flightTerminalItem)
            .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate);
        });
      });
    });

    it('renders an existing and correct "Source" label', function () {
      const flightSourceSelector = 'div.flight-details p.flight-timestamp span';
      const flightSourceItem = resultElement.querySelector(flightSourceSelector);
      chai.expect(flightSourceItem).to.contain.text(locale.source.message);
    });

    it('renders a "Source" text being a correct link', function () {
      const flightSourceLinkSelector = 'div.flight-details p.flight-timestamp a';
      const flightSourceLinkItem = resultElement.querySelector(flightSourceLinkSelector);
      chai.expect(flightSourceLinkItem).to.have.text('flightstats.com');
      chai.expect(flightSourceLinkItem.href).to.equal(results[0].url);
    });
  });
}
