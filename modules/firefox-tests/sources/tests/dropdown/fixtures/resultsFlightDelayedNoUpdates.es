export default [
  {
    url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
    score: 0,
    snippet: {
      extra: {
        depart_arrive: [
          {
            gate_full: 'Gate A37',
            location_name: 'Hamburg',
            location_short_name: 'HAM',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '07:00',
            terminal_full: 'Terminal 2',
          },
          {
            gate_full: 'Gate E53',
            location_name: 'Zürich',
            location_short_name: 'ZRH',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '08:25',
            terminal_full: 'Terminal 1',
          }
        ],
        flight_name: 'SWISS Flug 3029',
        flight_status: 'delayed',
        last_updated_ago: 39,
        plane_icon: 'http://cdn.cliqz.com/extension/EZ/flight/plane.svg',
        plane_position: '40',
        status: 'Verspätet',
        status_detail: '-'
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
  }
];
