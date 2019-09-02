/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  flight_no_info: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'no_info',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: '',
            plane_position: '',
            status: 'No information',
            status_color: 'grey',
            status_detail: '',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_arrived_late_departure: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'arrived',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: '100',
            status: 'Arrived',
            status_color: '#58B744',
            status_detail: 'late 2 hours',
            depart_arrive: [
              {
                estimate_actual_time: '11:55 am',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_time: '2:55 pm',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_arrived_early_departure: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'arrived',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: '100',
            status: 'Arrived',
            status_color: '#58B744',
            status_detail: 'late 2 hours',
            depart_arrive: [
              {
                estimate_actual_time: '11:30 am',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_time: '2:55 pm',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_arrived_in_time: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'arrived',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: '100',
            status: 'Arrived',
            status_color: '#58B744',
            status_detail: 'in time',
            depart_arrive: [
              {
                estimate_actual_time: '11:45 am',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_time: '2:25 pm',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_arrived_earlier: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'arrived',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: '100',
            status: 'Arrived',
            status_color: '#58B744',
            status_detail: 'earlier 10 minutes',
            depart_arrive: [
              {
                estimate_actual_time: '11:40 am',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_time: '2:15 pm',
                estimate_actual_date: 'Wed, 8 May',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_cancelled: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'cancelled',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: '0',
            status: 'Cancelled',
            status_color: 'red',
            status_detail: '',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_delayed: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'delayed',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
            plane_position: 35.29039036754929,
            status: 'Delayed (18 Minutes)',
            status_color: '#c3043e',
            status_detail: 'Arrival in 5 Hours 48 Minutes',
            depart_arrive: [
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '11:45 am',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '2:43 pm',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_delayed_early_departure: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'delayed',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
            plane_position: 35.29039036754929,
            status: 'Delayed (18 Minutes)',
            status_color: '#c3043e',
            status_detail: 'Arrival in 5 Hours 48 Minutes',
            depart_arrive: [
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '11:20 am',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '2:43 pm',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_delayed_no_updates: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'delayed',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-red-outline.svg',
            plane_position: 35.29039036754929,
            status: 'Delayed',
            status_color: '#c3043e',
            status_detail: 'Arrival in 5 Hours 48 Minutes',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_delayed_on_ground: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'delayed',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
            plane_position: 0,
            status: 'Delayed',
            status_color: '#c3043e',
            status_detail: '5 Hours 48 Minutes',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_diverted: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'diverted',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-red.svg',
            plane_position: '40',
            status: 'Diverted',
            status_color: 'red',
            status_detail: 'Bad weather',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                actual_location_short_name: 'BOS',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_scheduled: {
    query: 'lufthansa LH 729',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'scheduled',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green-outline.svg',
            plane_position: 0,
            status: 'Scheduled',
            status_color: '#c3043e',
            status_detail: '',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_on_time: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'on_time',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green.svg',
            plane_position: 0,
            status: 'On-time',
            status_color: '#c3043e',
            status_detail: '',
            depart_arrive: [
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_on_time_departed_early: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'on_time',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green.svg',
            plane_position: 35.29039036754929,
            status: 'On-time',
            status_color: '#c3043e',
            status_detail: 'Arrival in 5 Hours 48 Minutes',
            depart_arrive: [
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '11:20 am',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_on_time_departed_late: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'on_time',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green.svg',
            plane_position: 35.29039036754929,
            status: 'On-time',
            status_color: '#c3043e',
            status_detail: 'Arrival in 5 Hours 48 Minutes',
            depart_arrive: [
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '11:55 am',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  },
  flight_on_time_departed_late_landed: {
    query: 'flug',
    results: [
      {
        url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        href: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
        friendlyUrl: 'flightstats.com/go/flightstatus/flightstatusbyflight.do',
        kind: [
          'X|{"class":"EntityFlight"}'
        ],
        provider: 'rich-header',
        template: 'flight',
        text: 'lufthansa lx22',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'query',
          domain: 'flightstats.com',
          host: 'flightstats.com',
          hostAndPort: 'flightstats.com',
          port: '',
          url: 'flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=999100072&airlineCode=LX&flightNumber=22',
          subType: {
            id: '657c0646566f80f9d2906575f033d86cdb4473b215f4d52a15068f6830f5a7ee',
            class: 'EntityFlight',
            name: 'flightStatus'
          },
          completion: '',
          logo: {},
          extraLogos: {},
          externalProvidersLogos: {}
        },
        data: {
          deepResults: [],
          extra: {
            flight_name: 'SWISS Flight 22',
            flight_status: 'on_time',
            airline_hot_line: '1-877-359-7947',
            last_updated_ago: 0.06065511703491211,
            plane_icon: 'https://cdn.cliqz.com/extension/EZ/flight/plane-green.svg',
            plane_position: 100,
            status: 'On-time',
            status_color: '#c3043e',
            status_detail: 'Landed',
            depart_arrive: [
              {
                estimate_actual_date: 'Wed, 8 May',
                estimate_actual_time: '11:55 am',
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '11:45 am',
                gate: 'C56',
                gate_full: 'Gate C56',
                terminal: '-',
                terminal_full: 'Terminal -',
                location_name: 'Geneva',
                location_short_name: 'GVA',
                location_time_zone: 'Europe/Zurich',
                GMT: 'GMT+2',
                time_color: '#74d463'
              },
              {
                scheduled_date: 'Wed, 8 May',
                scheduled_time: '2:25 pm',
                gate: '-',
                gate_full: 'Gate -',
                terminal: '4',
                terminal_full: 'Terminal 4',
                location_name: 'New York City',
                location_short_name: 'NYC',
                location_time_zone: 'America/New_York',
                GMT: 'GMT-4',
                time_color: '#c3043e'
              }
            ]
          },
          kind: [
            'X|{"class":"EntityFlight"}'
          ],
          template: 'flight'
        }
      }
    ]
  }
};
