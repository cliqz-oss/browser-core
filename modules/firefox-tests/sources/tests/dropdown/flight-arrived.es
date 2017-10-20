/* global it, expect, chai, respondWith, fillIn, waitForPopup,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for flight results when plane arrived', function () {
    const result = [
      [
        {
          url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=934356439\u0026airlineCode=LX\u0026flightNumber=332',
          score: 0,
          snippet: {
            extra: {
              depart_arrive: [
                {
                  estimate_actual_date: 'fr.. 22 september',
                  estimate_actual_time: '12:16',
                  gate: 'D33',
                  location_name: 'Zürich',
                  location_short_name: 'ZRH',
                  scheduled_date: 'fr.. 22 september',
                  scheduled_time: '12:05',
                  terminal: '1',
                  time_color: '#c3043e'
                },
                {
                  estimate_actual_date: 'fr.. 22 september',
                  estimate_actual_time: '12:59',
                  gate: '-',
                  location_name: 'London',
                  location_short_name: 'LON',
                  scheduled_date: 'fr.. 22 september',
                  scheduled_time: '13:00',
                  terminal: '2',
                  time_color: '#74d463'
                }
              ],
              flight_name: 'SWISS Flug 332',
              flight_status: 'arrived',
              last_updated_ago: 14,
              plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
              plane_position: '100',
              status: 'Gelandet',
              status_color: '#74d463',
              status_detail: ' (29 Minuten spät)'
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
      ],
      [],
    ];
    result[1] = JSON.parse(JSON.stringify(result[0]));
    result[1][0].snippet.extra.depart_arrive[0].estimate_actual_time =
      result[1][0].snippet.extra.depart_arrive[0].scheduled_time;
    result[1][0].snippet.extra.depart_arrive[1].estimate_actual_time =
      result[1][0].snippet.extra.depart_arrive[1].scheduled_time;


    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;
    let results;

    context('late', function () {
      const flightUpdateSelector = 'div.flight-details p.flight-timestamp span';
      const flightArrivedSelector = 'div.flight-details div.flight-status span';
      let flightUpdateItem;
      let flightArrivedItem;

      before(function () {
        results = result[0];
        respondWith({ results });
        fillIn('flug LH8401');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        });
      });

      beforeEach(function () {
        flightUpdateItem = resultElement.querySelector(flightUpdateSelector);
        flightArrivedItem = resultElement.querySelectorAll(flightArrivedSelector);
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

      it('renders an "Arrived" text', function () {
        chai.expect(flightArrivedItem[0]).to.exist;
        chai.expect(flightArrivedItem[0]).to.have.text(results[0].snippet.extra.status);
      });

      it('renders delay info', function () {
        chai.expect(flightArrivedItem[1]).to.exist;
        chai.expect(flightArrivedItem[1])
          .to.contain.text(results[0].snippet.extra.status_detail);
      });

      it('renders a flight progress line ', function () {
        const flightProgressSelector = 'div.flight-details div.flight-progress-bar';
        const flightProgressItem = resultElement.querySelector(flightProgressSelector);
        chai.expect(flightProgressItem).to.exist;
      });

      it('renders a plane icon', function () {
        const win = CliqzUtils.getWindow();
        const flightProgressSelector = 'div.flight-details div.flight-progress-bar';
        // const flightProgressItem = resultElement.querySelector(flightProgressSelector);

        chai.expect(win.getComputedStyle(
          resultElement.querySelector(flightProgressSelector)).backgroundImage)
          .to.contain('plane-green-outline.svg');
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

          it(`renders existing and correct estimated ${flight} time`, function () {
            const flightEstTimeSelector = `div.flight-details div.${flight} span.estimate-${flight}-time`;
            const flightEstTimeItem = resultElement.querySelector(flightEstTimeSelector);
            chai.expect(flightEstTimeItem).to.exist;
            chai.expect(flightEstTimeItem)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].scheduled_time);
          });

          it(`renders existing and correct actual ${flight} time`, function () {
            const flightTimeSelector = `div.flight-details div.${flight} span.${flight}-time`;
            const flightTimeItem = resultElement.querySelector(flightTimeSelector);
            chai.expect(flightTimeItem).to.exist;
            chai.expect(flightTimeItem)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].estimate_actual_time);
          });

          it('renders terminal label and terminal info', function () {
            chai.expect(flightTerminalItem).to.exist;
            chai.expect(flightTerminalItem).to.contain.text(locale.Terminal.message);
            chai.expect(flightTerminalItem)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].terminal);
          });

          it('renders gate label and gate info', function () {
            chai.expect(flightTerminalItem).to.exist;
            chai.expect(flightTerminalItem).to.contain.text(locale.Gate.message);
            chai.expect(flightTerminalItem)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].gate);
          });
        });
      });

      it('renders an existing and correct "Source" label', function () {
        chai.expect(flightUpdateItem).to.contain.text(locale.source.message);
      });

      it('renders a "Source" text being a correct link', function () {
        const flightSourceLinkSelector = 'div.flight-details p.flight-timestamp a';
        const flightSourceLinkItem = resultElement.querySelector(flightSourceLinkSelector);
        chai.expect(flightSourceLinkItem).to.have.text('flightstats.com');
        chai.expect(flightSourceLinkItem.href).to.equal(results[0].url);
      });

      it('renders an existing "Updated XXX ago" label', function () {
        chai.expect(flightUpdateItem).to.contain.text(locale.updated.message);
      });
    });

    context('on time', function () {
      before(function () {
        results = result[1];
        respondWith({ results });
        fillIn('flug LH8401');
        return waitForPopup().then(function () {
          resultElement = $cliqzResults()[0];
        });
      });

      ['depart', 'arrival'].forEach(function (flight, i) {
        context(`for ${flight} info`, function () {
          it(`does not render estimated ${flight} time`, function () {
            const flightEstTimeSelector = `div.flight-details div.${flight} span.estimate-${flight}-time`;
            const flightEstTimeItem = resultElement.querySelector(flightEstTimeSelector);
            chai.expect(flightEstTimeItem).to.not.exist;
          });

          it(`renders existing and correct actual ${flight} time`, function () {
            const flightTimeSelector = `div.flight-details div.${flight} span.${flight}-time`;
            const flightTimeItem = resultElement.querySelector(flightTimeSelector);
            chai.expect(flightTimeItem).to.exist;
            chai.expect(flightTimeItem)
              .to.contain.text(results[0].snippet.extra.depart_arrive[i].estimate_actual_time);
          });
        });
      });
    });
  });
}
