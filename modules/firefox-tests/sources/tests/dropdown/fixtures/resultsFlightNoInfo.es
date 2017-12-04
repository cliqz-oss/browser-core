export default [
  {
    url: 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=934356486\u0026airlineCode=SWU\u0026flightNumber=353',
    score: 0,
    snippet: {
      extra: {
        depart_arrive: [
          {
            terminal_full: 'Terminal 1',
            gate_full: 'Gate A37',
            location_name: 'London',
            location_short_name: 'LON',
            time_color: '',
            estimate_actual_date: 'fr.. 22 september',
            estimate_actual_time: '09:15',
          },
          {
            estimate_actual_date: 'fr.. 22 september',
            estimate_actual_time: '11:45',
            terminal_full: 'Terminal 1',
            gate_full: 'Gate A37',
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
