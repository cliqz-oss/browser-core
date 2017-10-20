export default {
  flight_no_info: {
    query: 'flug LH8401',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 123',
            status: 'No information',
            flight_status: 'no_info',
            status_color: 'grey',
            status_detail: '',
            plane_icon: '',
            plane_position: '',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: '',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: '',
                estimate_actual_time: '16:15',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_arrived: {
    query: 'lufthansa LH 729',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 729',
            status: 'Arrived',
            flight_status: 'arrived',
            status_color: '#58B744',
            status_detail: 'late 2 hours',
            plane_icon: 'plane-green-outline.svg',
            plane_position: '100',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: '',
                scheduled_time: '11:00',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: '',
                estimate_actual_time: '16:15',
                estimate_actual_date: 'Tue, 14 February',
                actual_time: '17:25',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_cancelled: {
    query: 'flug',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 123',
            status: 'Cancelled',
            flight_status: 'cancelled',
            status_color: 'red',
            status_detail: 'Lufthansa hotline +49 69 86 799 799',
            plane_icon: 'plane-red-outline.svg',
            plane_position: '0',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: '',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: '',
                estimate_actual_time: '16:15',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_delayed: {
    query: 'flug',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 123',
            status: 'Delayed',
            flight_status: 'delayed',
            status_color: 'red',
            status_detail: '2 hours 10 minutes',
            plane_icon: 'plane-red.svg',
            plane_position: '20',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: 'red',
                estimate_actual_time: '11:04',
                actual_time: '13:14',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: 'red',
                estimate_actual_time: '16:15',
                actual_time: '17:25',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_diverted: {
    query: 'flug',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 123',
            status: 'Diverted',
            flight_status: 'diverted',
            status_color: 'red',
            status_detail: 'Bad Weather',
            plane_icon: 'plane-red.svg',
            plane_position: '40',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: '',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                actual_location_short_name: 'FRA',
                time_color: 'red',
                estimate_actual_time: '16:15',
                actual_time: '17:25',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_scheduled: {
    query: 'lufthansa LH 729',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 729',
            status: 'Scheduled',
            flight_status: 'scheduled',
            status_color: 'green',
            plane_icon: 'plane-green.svg',
            plane_position: '0',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: '',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: '',
                estimate_actual_time: '16:15',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  },
  flight_on_time: {
    query: 'lufthansa LH 729',
    results: [
      {
        data: {
          template: 'flight',
          extra: {
            flight_name: 'Lufthansa LH 729',
            status: 'On-time',
            flight_status: 'on_time',
            status_color: 'green',
            status_detail: 'arrives in 8 hours',
            plane_icon: 'plane-green.svg',
            plane_position: '10',
            depart_arrive: {
              0: {
                location_name: 'Shanghai-Pudong',
                location_short_name: 'PVG',
                time_color: 'green',
                estimate_actual_time: '11:04',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '2',
                gate: 'L11'
              },
              1: {
                location_name: 'Frankfurt',
                location_short_name: 'GTO',
                time_color: 'green',
                estimate_actual_time: '16:15',
                estimate_actual_date: 'Tue, 14 February',
                terminal: '1',
                gate: 'B54'
              }
            }
          }
        }
      }
    ]
  }
};
