export default [
  {
    url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=938080635\u0026airlineCode=4U\u0026flightNumber=7760',
    score: 0,
    snippet: {
      extra: {
        depart_arrive: [
          {
            estimate_actual_date: 'fr.. 27 oktober',
            estimate_actual_time: '07:00',
            gate_full: 'Gate A37',
            location_name: 'Shanghai-Pudong',
            location_short_name: 'PVG',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '07:00',
            terminal_full: 'Terminal 1',
            time_color: '#c3043e'
          },
          {
            estimate_actual_date: 'fr.. 27 oktober',
            estimate_actual_time: '07:55',
            gate_full: 'Gate B12',
            location_name: 'Frankfurt',
            actual_location_short_name: 'FRA',
            location_short_name: 'GTO',
            scheduled_date: 'fr.. 27 oktober',
            scheduled_time: '07:55',
            terminal_full: 'Terminal 2',
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
