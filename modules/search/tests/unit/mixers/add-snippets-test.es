/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule, chai */
const Rx = require('rxjs');
const operators = require('rxjs/operators');

const mock = {
  rxjs: Rx,
  'rxjs/operators': operators,
};

// https://api.cliqz.com/api/v2/results?q=lh11
const data = {
  cached: false,
  choice: 'type2',
  country: 'de',
  duration: 53,
  max_age: 600,
  offers: [],
  q: 'lh11',
  results: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id...ightNumber=11',
      score: 0,
      snippet: {
        extra: {
          airline_hot_line: '800 645-3880',
          depart_arrive: [
            {
              GMT: 'GMT+1',
              estimate_actual_date: 'Do., 24. Jan.',
              estimate_actual_time: '08:59',
              gate: 'A17',
              gate_full: 'Gate A17',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              location_time_zone: 'Europe/Berlin',
              scheduled_date: 'Do., 24. Jan.',
              scheduled_time: '09:00',
              terminal: '2',
              terminal_full: 'Terminal 2',
              time_color: '#74d463'
            },
            {
              GMT: 'GMT+1',
              estimate_actual_date: 'Do., 24. Jan.',
              estimate_actual_time: '10:07',
              gate: 'A21',
              gate_full: 'Gate A21',
              location_name: 'Frankfurt Am Main',
              location_short_name: 'FRA',
              location_time_zone: 'Europe/Berlin',
              scheduled_date: 'Do., 24. Jan.',
              scheduled_time: '10:10',
              terminal: '1',
              terminal_full: 'Terminal 1',
              time_color: '#74d463'
            }
          ],
          flight_name: 'Lufthansa Flug 11',
          flight_status: 'arrived',
          last_updated_ago: 5.111572027206421,
          plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
          plane_position: 100,
          status: 'Gelandet',
          status_color: '#74d463',
          status_detail: ''
        },
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        last_update: 1548326714.6949592
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '262fe793d4311d6e15442abf4dc54923b14e562b2921aceff7d53c3663b51527',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'suggestion'
    },
    {
      url: 'https://www.flightradar24.com/data/flights/lh111',
      score: 3.382316,
      snippet: {
        description: 'LH111 (Lufthansa) - Live flight status, scheduled flights, route and airport',
        extra: {
          alternatives: [],
          language: {
            en: 0.9900000095367432
          },
          og: {
            description: 'Flightradar24 is the best live flight... Best coverage and cool features!',
            image: 'https://imgr.cliqz.com/GXZTKybS5CzR7tr1...ojRrNUy9sb2dvX2ZyMjRfZmxhdC5wbmc.png',
            title: 'Flightradar24.com - Live flight tracker!',
            type: 'website'
          }
        },
        title: 'Lufthansa flight LH111 - Flightradar24'
      },
      c_url: 'https://www.flightradar24.com/data/flights/lh111',
      similars: [
        'https://www.flightradar24.com/data/flights/lh11'
      ],
      type: 'bm'
    }
  ],
  snippets: [
    {
      rh_latency: 0.0031371116638183594,
      snippet: {
        extra: {
          airline_hot_line: '800 645-3880',
          depart_arrive: [
            {},
            {}
          ],
          flight_name: 'Lufthansa Flug 11',
          flight_status: 'arrived',
          last_updated_ago: 5.111572027206421,
          plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
          plane_position: 100,
          status: 'Gelandet',
          status_color: '#74d463',
          status_detail: ''
        },
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        last_update: 1548326714.6949592
      },
      subType: {
        class: 'EntityFlight',
        id: '262fe793d4311d6e15442abf4dc54923b14e562b2921aceff7d53c3663b51527',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'suggestion',
      type: 'rh',
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?026flightNumber=11'
    }
  ],
  suggestions: [
    'lh1129',
    'lh1130',
    'lh111',
    'lh1115',
    'lh119'
  ],
  ver: 'v2'
};

export default describeModule('search/mixers/add-snippets',
  () => mock,
  () => {
    describe('#addSnippetsResultsToResultResponses', function () {
      let addSnippetsResultsToResultResponses;

      beforeEach(function () {
        addSnippetsResultsToResultResponses = this.module().addSnippetsResultsToResultResponses;
      });

      it('snippets.length > 0', function () {
        const suiteData = Object.assign(data);
        const { snippets } = suiteData;
        const { results } = suiteData;

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results: [snippets[0], ...results] });
      });

      it('snippets.length === 0', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = [];

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is not defined (== null)', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = null;

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is NaN', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = NaN;

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is a plain object (== {})', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = {};

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is empty string (== "")', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = '';

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is a boolean value (== false)', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = false;

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });

      it('snippets is a function', function () {
        const suiteData = Object.assign(data);
        const { results } = suiteData;
        suiteData.snippets = function () {};

        chai.expect(addSnippetsResultsToResultResponses(suiteData, suiteData))
          .to.deep.equal({ ...data, results });
      });
    });
  });
