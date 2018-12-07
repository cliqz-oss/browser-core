export default {
  arrivedAllEarly: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '06:55',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2',
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:20',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1',
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'arrived',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '100',
          status: 'Gelandet',
          status_detail: '5 minutes early',
        },
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  arrivedAllLate: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:05',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2',
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:30',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1',
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'arrived',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '100',
          status: 'Gelandet',
          status_detail: '5 minutes late'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  arrivedDepEarlyArrLate: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '06:55',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:40',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'arrived',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '100',
          status: 'Gelandet',
          status_detail: '5 minutes early'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  arrivedOnTime: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:25',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'arrived',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '100',
          status: 'Gelandet',
          status_detail: 'on time'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  cancelled: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Lebanon',
              location_short_name: 'LEB',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2',
              time_color: '#c3043e'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:55',
              gate_full: '-',
              gate: '-',
              location_name: 'Boston',
              location_short_name: 'BOS',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:55',
              terminal_full: 'C',
              terminal: 'C',
              time_color: '#c3043e'
            }
          ],
          flight_name: 'Amiyi Airlines Flug 1870',
          flight_status: 'cancelled',
          last_updated_ago: 15,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
          plane_position: '0',
          status: 'Gestrichen',
          status_color: '#c3043e',
          status_detail: 'Lufthansa hotline +49 69 86 799 799'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  delayedDepEarly: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '06:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:35',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'delayed',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '40',
          status: 'Verspätet',
          status_detail: 'delayed 10 minutes'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  delayedNoUpdates: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:25',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'delayed',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '40',
          status: 'Verspätet',
          status_detail: '-'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  diverted: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Shanghai-Pudong',
              location_short_name: 'PVG',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 1',
              terminal: '1',
              time_color: '#c3043e'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:55',
              gate_full: 'Gate B12',
              gate: 'B12',
              location_name: 'Frankfurt',
              actual_location_short_name: 'FRA',
              location_short_name: 'GTO',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:55',
              terminal_full: 'Terminal 2',
              terminal: '2',
              time_color: '#c3043e'
            }
          ],
          flight_name: 'Lufthansa LH 123',
          flight_status: 'diverted',
          last_updated_ago: 15,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
          plane_position: '30',
          status: 'Diverted',
          status_color: '#c3043e',
          status_detail: 'Bad weather'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  noInfo: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=934356486\u0026airlineCode=SWU\u0026flightNumber=353',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 22 september',
              estimate_actual_time: '09:15',
              terminal_full: 'Terminal 1',
              terminal: '1',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'London',
              location_short_name: 'LON',
              time_color: '',
              scheduled_date: 'fr.. 22 september',
              scheduled_time: '09:15',
            },
            {
              estimate_actual_date: 'fr.. 22 september',
              estimate_actual_time: '11:45',
              terminal_full: 'Terminal 1',
              terminal: '1',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Genf',
              location_short_name: 'GVA',
              time_color: '',
              scheduled_date: 'fr.. 22 september',
              scheduled_time: '11:45',
            }
          ],
          last_updated_ago: 15,
          flight_name: 'SWISS Flug 353',
          flight_status: 'no_info',
          plane_icon: '',
          plane_position: '',
          status: 'No information',
          status_color: 'grey',
          status_detail: ''
        }
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
  onTimeDepEarly: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '06:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:35',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:35',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'on_time',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '40',
          status: 'Pünktlich',
          status_detail: 'Ankunft in 3 Stunden'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  onTimeDepLate: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:05',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:35',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:35',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'on_time',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '40',
          status: 'Pünktlich',
          status_detail: 'Ankunft in 3 Stunden'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ],
  scheduled: [
    {
      url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
      score: 0,
      snippet: {
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        extra: {
          depart_arrive: [
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '07:00',
              gate_full: 'Gate A37',
              gate: 'A37',
              location_name: 'Hamburg',
              location_short_name: 'HAM',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '07:00',
              terminal_full: 'Terminal 2',
              terminal: '2'
            },
            {
              estimate_actual_date: 'fr.. 27 oktober',
              estimate_actual_time: '08:25',
              gate_full: 'Gate E53',
              gate: 'E53',
              location_name: 'Zürich',
              location_short_name: 'ZRH',
              scheduled_date: 'fr.. 27 oktober',
              scheduled_time: '08:25',
              terminal_full: 'Terminal 1',
              terminal: '1'
            }
          ],
          flight_name: 'SWISS Flug 3029',
          flight_status: 'scheduled',
          last_updated_ago: 39,
          plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
          plane_position: '0',
          status: 'Vorgesehen',
          status_detail: 'Abflug in 10 Stunden'
        }
      },
      type: 'rh',
      subType: {
        class: 'EntityFlight',
        id: '-854077855497762003',
        name: 'flightStatus'
      },
      template: 'flight',
      trigger_method: 'query'
    }
  ]
};

export const flightAndNormalResult = [
  {
    url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
    score: 0,
    snippet: {
      extra: {
        depart_arrive: [
          {
            estimate_actual_date: 'fr.. 27 oktober',
            estimate_actual_time: '06:55',
            gate_full: 'Gate A37',
            location_name: 'Hamburg',
            location_short_name: 'HAM',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '07:00',
            terminal_full: 'Terminal 2',
          },
          {
            estimate_actual_date: 'fr.. 27 oktober',
            estimate_actual_time: '08:20',
            gate_full: 'Gate E53',
            location_name: 'Zürich',
            location_short_name: 'ZRH',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '08:25',
            terminal_full: 'Terminal 1',
          }
        ],
        flight_name: 'SWISS Flug 3029',
        flight_status: 'arrived',
        last_updated_ago: 39,
        plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
        plane_position: '100',
        status: 'Gelandet',
        status_detail: '5 minutes early'
      },
      friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do'
    },
    type: 'rh',
    subType: {
      class: 'EntityFlight',
      id: '-854077855497762003',
      name: 'flightStatus'
    },
    template: 'flight',
    trigger_method: 'query'
  },
  {
    url: 'https://de.aviability.com/flugnummer/flug-lx3029-swiss-international-air-lines',
    snippet: {
      description: 'LX3029 Flug (LX 3029); Swiss International Air Lines; Abflug 07:00, Hamburg, Fuhlsbüttel (HAM) Terminal 2; Ankunft 08:25, Zürich, Kloten (ZRH); Dauer 1h 25m',
      extra: {
        alternatives: [
          'https://de.aviability.com/flugnummer/flug-lx3029-swiss-international-air-lines'
        ],
        language: {
          de: 0.9700000286102295
        },
        og: {
          image: 'https://de.aviability.com/images/fb.png',
          title: 'LX3029 Flugplan und Flugpreise - Aviability.com',
          type: 'website'
        }
      },
      title: 'LX3029 Flugplan und Flugpreise'
    },
    c_url: 'https://de.aviability.com/flugnummer/flug-lx3029-swiss-international-air-lines',
    type: 'bm'
  }
];
