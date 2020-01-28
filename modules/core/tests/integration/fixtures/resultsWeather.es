/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: '> Title - extended_forecast',
              url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.1500,11.5833#forecast'
            }
          ],
          type: 'buttons'
        }
      ],
      extra: {
        api_returned_location: 'Maxvorstadt, Germany',
        forecast_v2: {
          units_label: 'Ma\u00dfeinheit',
          forecast_description: 'Detaillierte Vorhersage',
          default_unit: 'metric',
          alt_unit: 'usc',
          provider: {
            name: 'weather.com',
            url: 'https://www.weather.com'
          },
          forecast: [
            {
              day: {
                weekday: 'Dienstag',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Di., 8. Jan.',
                precipitation: {
                  value: 0,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: 1,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 33,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 250,
                    value: 31,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 250,
                    value: 19,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 90,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00',
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      1,
                      1,
                      1,
                      1,
                      1,
                      1,
                      0,
                      0
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      33,
                      33,
                      33,
                      33,
                      33,
                      33,
                      32,
                      32
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    262,
                    264,
                    264,
                    264,
                    264,
                    264,
                    264,
                    265,
                    267,
                    269,
                    271,
                    273,
                    273,
                    277,
                    277,
                    282,
                    285,
                    285,
                    288,
                    292,
                    297,
                    302,
                    303,
                    301
                  ],
                  metric: {
                    values: [
                      31,
                      31,
                      30,
                      29,
                      30,
                      32,
                      33,
                      32,
                      33,
                      32,
                      32,
                      32,
                      31,
                      32,
                      32,
                      32,
                      32,
                      31,
                      30,
                      28,
                      27,
                      24,
                      23,
                      22
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      19,
                      19,
                      18,
                      18,
                      18,
                      19,
                      20,
                      19,
                      20,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      18,
                      17,
                      16,
                      14,
                      14,
                      13
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    53,
                    39,
                    24,
                    24,
                    32,
                    53,
                    72,
                    76,
                    81,
                    78,
                    74,
                    57,
                    45,
                    51,
                    53,
                    69,
                    76,
                    82,
                    85,
                    79,
                    79,
                    73,
                    65,
                    59
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Mittwoch',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Mi., 9. Jan.',
                precipitation: {
                  value: 70,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -2,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 28,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 304,
                    value: 24,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 304,
                    value: 14,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 89,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      2,
                      2,
                      1,
                      1,
                      1,
                      1,
                      1,
                      1,
                      0,
                      0,
                      0,
                      0,
                      0,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      35,
                      35,
                      33,
                      33,
                      33,
                      33,
                      33,
                      33,
                      32,
                      32,
                      32,
                      32,
                      32,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    277,
                    282,
                    285,
                    285,
                    288,
                    292,
                    297,
                    302,
                    303,
                    301,
                    300,
                    303,
                    308,
                    309,
                    309,
                    305,
                    301,
                    301,
                    299,
                    297,
                    293,
                    293,
                    288,
                    291
                  ],
                  metric: {
                    values: [
                      32,
                      32,
                      32,
                      31,
                      30,
                      28,
                      27,
                      24,
                      23,
                      22,
                      22,
                      22,
                      20,
                      20,
                      19,
                      17,
                      17,
                      15,
                      15,
                      15,
                      16,
                      16,
                      17,
                      17
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      19,
                      19,
                      19,
                      19,
                      18,
                      17,
                      16,
                      14,
                      14,
                      13,
                      13,
                      13,
                      12,
                      12,
                      11,
                      10,
                      10,
                      9,
                      9,
                      9,
                      9,
                      9,
                      10,
                      10
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    53,
                    69,
                    76,
                    82,
                    85,
                    79,
                    79,
                    73,
                    65,
                    59,
                    64,
                    70,
                    67,
                    64,
                    65,
                    66,
                    66,
                    67,
                    69,
                    73,
                    73,
                    73,
                    80,
                    86
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Donnerstag',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Do., 10. Jan.',
                precipitation: {
                  value: 100,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -6,
                    max: -1,
                    value: -1,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 21,
                    max: 30,
                    value: 30,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 330,
                    value: 15,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 330,
                    value: 9,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 92,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -1,
                      -1,
                      -2,
                      -2,
                      -2,
                      -2,
                      -2,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -2,
                      -2,
                      -3
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      30,
                      30,
                      28,
                      28,
                      28,
                      28,
                      28,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      28,
                      28,
                      26
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    290,
                    290,
                    292,
                    290,
                    293,
                    300,
                    307,
                    314,
                    324,
                    329,
                    331,
                    331,
                    334,
                    335,
                    333,
                    332,
                    328,
                    333,
                    339,
                    339,
                    338,
                    338,
                    333,
                    337
                  ],
                  metric: {
                    values: [
                      16,
                      16,
                      17,
                      17,
                      17,
                      15,
                      14,
                      14,
                      13,
                      14,
                      14,
                      15,
                      15,
                      15,
                      15,
                      14,
                      14,
                      13,
                      13,
                      12,
                      12,
                      11,
                      10,
                      10
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      9,
                      9,
                      10,
                      10,
                      10,
                      9,
                      8,
                      8,
                      8,
                      8,
                      8,
                      9,
                      9,
                      9,
                      9,
                      8,
                      8,
                      8,
                      8,
                      7,
                      7,
                      6,
                      6,
                      6
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    91,
                    95,
                    97,
                    96,
                    96,
                    96,
                    96,
                    95,
                    92,
                    88,
                    76,
                    72,
                    70,
                    69,
                    68,
                    69,
                    69,
                    69,
                    64,
                    57,
                    57,
                    53,
                    35,
                    34
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Freitag',
                description: 'Nachm. Schneeschauer',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Fr., 11. Jan.',
                precipitation: {
                  value: 40,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -3,
                    max: -3,
                    value: -3,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 26,
                    max: 26,
                    value: 26,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 262,
                    value: 15,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 262,
                    value: 9,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 84,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 1,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -3,
                      -3,
                      -4,
                      -4,
                      -4,
                      -5,
                      -5,
                      -5,
                      -6,
                      -6,
                      -5,
                      -5,
                      -4,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -2,
                      -2,
                      -2,
                      -2
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      26,
                      26,
                      24,
                      24,
                      24,
                      23,
                      23,
                      23,
                      21,
                      21,
                      23,
                      23,
                      24,
                      26,
                      26,
                      26,
                      26,
                      26,
                      26,
                      26,
                      28,
                      28,
                      28,
                      28
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    337,
                    333,
                    330,
                    313,
                    304,
                    290,
                    288,
                    279,
                    276,
                    275,
                    266,
                    263,
                    260,
                    255,
                    260,
                    257,
                    255,
                    255,
                    250,
                    249,
                    248,
                    249,
                    248,
                    250
                  ],
                  metric: {
                    values: [
                      10,
                      9,
                      9,
                      8,
                      8,
                      8,
                      8,
                      8,
                      8,
                      10,
                      10,
                      13,
                      13,
                      15,
                      15,
                      15,
                      15,
                      15,
                      16,
                      17,
                      19,
                      20,
                      21,
                      21
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      6,
                      5,
                      5,
                      4,
                      4,
                      4,
                      4,
                      4,
                      4,
                      6,
                      6,
                      8,
                      8,
                      9,
                      9,
                      9,
                      9,
                      9,
                      9,
                      10,
                      11,
                      12,
                      13,
                      13
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    33,
                    17,
                    17,
                    17,
                    24,
                    13,
                    24,
                    12,
                    12,
                    11,
                    7,
                    7,
                    6,
                    6,
                    6,
                    7,
                    35,
                    39,
                    43,
                    47,
                    46,
                    49,
                    49,
                    47
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Samstag',
                description: 'Vorm. Schneeschauer',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Sa., 12. Jan.',
                precipitation: {
                  value: 40,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: 1,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 33,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 257,
                    value: 23,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 257,
                    value: 14,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 84,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -2,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      0,
                      0,
                      0,
                      0,
                      1,
                      1,
                      1,
                      1,
                      1,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      28,
                      30,
                      30,
                      30,
                      30,
                      30,
                      32,
                      32,
                      32,
                      32,
                      33,
                      33,
                      33,
                      33,
                      33,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    250,
                    253,
                    255,
                    254,
                    256,
                    260,
                    258,
                    260,
                    258,
                    259,
                    256,
                    257,
                    257,
                    255,
                    258,
                    255,
                    255,
                    256,
                    255,
                    256,
                    255,
                    255,
                    254,
                    254
                  ],
                  metric: {
                    values: [
                      21,
                      21,
                      22,
                      22,
                      22,
                      22,
                      22,
                      21,
                      20,
                      21,
                      21,
                      22,
                      22,
                      22,
                      22,
                      22,
                      23,
                      23,
                      23,
                      24,
                      25,
                      27,
                      28,
                      27
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      12,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      14,
                      14,
                      14,
                      14,
                      15,
                      16,
                      17,
                      16
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    49,
                    42,
                    24,
                    37,
                    24,
                    24,
                    24,
                    24,
                    24,
                    24,
                    40,
                    39,
                    24,
                    12,
                    11,
                    11,
                    10,
                    10,
                    12,
                    15,
                    15,
                    15,
                    58,
                    71
                  ]
                }
              }
            }
          ]
        },
        forecast: [
          {
            desc: 'Rain',
            description: 'Rain',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/rain.gif',
            max: '6\u00b0',
            min: '-2\u00b0',
            weekday: 'Fri',
            minByUnit: {
              celsius: '14\u00b0',
              fahrenheit: '57\u00b0'
            },
            maxByUnit: {
              celsius: '24\u00b0',
              fahrenheit: '76\u00b0'
            }
          },
          {
            desc: 'Clear',
            description: 'Clear',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/clear.gif',
            max: '7\u00b0',
            min: '0\u00b0',
            weekday: 'Sat',
            minByUnit: {
              celsius: '12\u00b0',
              fahrenheit: '54\u00b0'
            },
            maxByUnit: {
              celsius: '19\u00b0',
              fahrenheit: '67\u00b0'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Partly Cloudy',
            icon: 'http://localhost:3000/static/images/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '11\u00b0',
            min: '0\u00b0',
            weekday: 'Sun',
            minByUnit: {
              celsius: '11\u00b0',
              fahrenheit: '52\u00b0'
            },
            maxByUnit: {
              celsius: '21\u00b0',
              fahrenheit: '70\u00b0'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Partly Cloudy',
            icon: 'http://localhost:3000/static/images/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '14\u00b0',
            min: '3\u00b0',
            weekday: 'Mon',
            minByUnit: {
              celsius: '13\u00b0',
              fahrenheit: '55\u00b0'
            },
            maxByUnit: {
              celsius: '23\u00b0',
              fahrenheit: '74\u00b0'
            }
          }
        ],
        meta: {
          cached_weather_data: 'yes',
          'lazy-RH': 0,
          'lazy-RH1': 0,
          'lazy-snpt1': 0,
          location: 'Munich, Germany',
          version: '21Dec15'
        },
        searched_city: 'Munich, Germany',
        searched_country: 'Germany - default',
        title_icon: 'http://localhost:3000/static/images/weather.svg',
        todayDesc: 'Overcast',
        todayDescription: 'Overcast',
        todayIcon: 'http://localhost:3000/static/images/cloudy.svg',
        todayIcon_bck: 'http://localhost:3000/static/images/cloudy.gif',
        todayMax: '19\u00b0',
        todayMin: '4\u00b0',
        todayTemp: '17\u00b0',
        todayWeekday: 'Today',
        todayMinByUnit: {
          celsius: '12\u00b0',
          fahrenheit: '53\u00b0'
        },
        todayMaxByUnit: {
          celsius: '22\u00b0',
          fahrenheit: '73\u00b0'
        },
        units_label: 'Scale'
      },
      friendlyUrl: 'wunderground.com/cgi-bin/findweather/getforecast',
      title: '> Title - München, Deutschland'
    },
    type: 'rh',
    subType: {
      class: 'EntityWeather',
      id: '8589837466389510234',
      name: 'weather EZ'
    },
    template: 'weatherEZ',
    trigger_method: 'query'
  }
];

export const weatherResults = [
  {
    url: 'https://www.weather.com',
    score: 0,
    snippet: {
      extra: {
        api_returned_location: 'Maxvorstadt, Germany',
        forecast_v2: {
          units_label: 'Ma\u00dfeinheit',
          forecast_description: 'Detaillierte Vorhersage',
          default_unit: 'metric',
          alt_unit: 'usc',
          provider: {
            name: 'weather.com',
            url: 'https://www.weather.com'
          },
          forecast: [
            {
              day: {
                weekday: 'Dienstag',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Di., 8. Jan.',
                precipitation: {
                  value: 0,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: 1,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 33,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 250,
                    value: 31,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 250,
                    value: 19,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 90,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00',
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      1,
                      1,
                      1,
                      1,
                      1,
                      1,
                      0,
                      0
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      33,
                      33,
                      33,
                      33,
                      33,
                      33,
                      32,
                      32
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    262,
                    264,
                    264,
                    264,
                    264,
                    264,
                    264,
                    265,
                    267,
                    269,
                    271,
                    273,
                    273,
                    277,
                    277,
                    282,
                    285,
                    285,
                    288,
                    292,
                    297,
                    302,
                    303,
                    301
                  ],
                  metric: {
                    values: [
                      31,
                      31,
                      30,
                      29,
                      30,
                      32,
                      33,
                      32,
                      33,
                      32,
                      32,
                      32,
                      31,
                      32,
                      32,
                      32,
                      32,
                      31,
                      30,
                      28,
                      27,
                      24,
                      23,
                      22
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      19,
                      19,
                      18,
                      18,
                      18,
                      19,
                      20,
                      19,
                      20,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      19,
                      18,
                      17,
                      16,
                      14,
                      14,
                      13
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    53,
                    39,
                    24,
                    24,
                    32,
                    53,
                    72,
                    76,
                    81,
                    78,
                    74,
                    57,
                    45,
                    51,
                    53,
                    69,
                    76,
                    82,
                    85,
                    79,
                    79,
                    73,
                    65,
                    59
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Mittwoch',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Mi., 9. Jan.',
                precipitation: {
                  value: 70,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -2,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 28,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 304,
                    value: 24,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 304,
                    value: 14,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 89,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      2,
                      2,
                      1,
                      1,
                      1,
                      1,
                      1,
                      1,
                      0,
                      0,
                      0,
                      0,
                      0,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      35,
                      35,
                      33,
                      33,
                      33,
                      33,
                      33,
                      33,
                      32,
                      32,
                      32,
                      32,
                      32,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    277,
                    282,
                    285,
                    285,
                    288,
                    292,
                    297,
                    302,
                    303,
                    301,
                    300,
                    303,
                    308,
                    309,
                    309,
                    305,
                    301,
                    301,
                    299,
                    297,
                    293,
                    293,
                    288,
                    291
                  ],
                  metric: {
                    values: [
                      32,
                      32,
                      32,
                      31,
                      30,
                      28,
                      27,
                      24,
                      23,
                      22,
                      22,
                      22,
                      20,
                      20,
                      19,
                      17,
                      17,
                      15,
                      15,
                      15,
                      16,
                      16,
                      17,
                      17
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      19,
                      19,
                      19,
                      19,
                      18,
                      17,
                      16,
                      14,
                      14,
                      13,
                      13,
                      13,
                      12,
                      12,
                      11,
                      10,
                      10,
                      9,
                      9,
                      9,
                      9,
                      9,
                      10,
                      10
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    53,
                    69,
                    76,
                    82,
                    85,
                    79,
                    79,
                    73,
                    65,
                    59,
                    64,
                    70,
                    67,
                    64,
                    65,
                    66,
                    66,
                    67,
                    69,
                    73,
                    73,
                    73,
                    80,
                    86
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Donnerstag',
                description: 'Schneefall',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Do., 10. Jan.',
                precipitation: {
                  value: 100,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -6,
                    max: -1,
                    value: -1,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 21,
                    max: 30,
                    value: 30,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 330,
                    value: 15,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 330,
                    value: 9,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 92,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -1,
                      -1,
                      -2,
                      -2,
                      -2,
                      -2,
                      -2,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      -2,
                      -2,
                      -3
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      30,
                      30,
                      28,
                      28,
                      28,
                      28,
                      28,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      30,
                      28,
                      28,
                      26
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    290,
                    290,
                    292,
                    290,
                    293,
                    300,
                    307,
                    314,
                    324,
                    329,
                    331,
                    331,
                    334,
                    335,
                    333,
                    332,
                    328,
                    333,
                    339,
                    339,
                    338,
                    338,
                    333,
                    337
                  ],
                  metric: {
                    values: [
                      16,
                      16,
                      17,
                      17,
                      17,
                      15,
                      14,
                      14,
                      13,
                      14,
                      14,
                      15,
                      15,
                      15,
                      15,
                      14,
                      14,
                      13,
                      13,
                      12,
                      12,
                      11,
                      10,
                      10
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      9,
                      9,
                      10,
                      10,
                      10,
                      9,
                      8,
                      8,
                      8,
                      8,
                      8,
                      9,
                      9,
                      9,
                      9,
                      8,
                      8,
                      8,
                      8,
                      7,
                      7,
                      6,
                      6,
                      6
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    91,
                    95,
                    97,
                    96,
                    96,
                    96,
                    96,
                    95,
                    92,
                    88,
                    76,
                    72,
                    70,
                    69,
                    68,
                    69,
                    69,
                    69,
                    64,
                    57,
                    57,
                    53,
                    35,
                    34
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Freitag',
                description: 'Nachm. Schneeschauer',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Fr., 11. Jan.',
                precipitation: {
                  value: 40,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: -3,
                    max: -3,
                    value: -3,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 26,
                    max: 26,
                    value: 26,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 262,
                    value: 15,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 262,
                    value: 9,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 84,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 1,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -3,
                      -3,
                      -4,
                      -4,
                      -4,
                      -5,
                      -5,
                      -5,
                      -6,
                      -6,
                      -5,
                      -5,
                      -4,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -3,
                      -2,
                      -2,
                      -2,
                      -2
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      26,
                      26,
                      24,
                      24,
                      24,
                      23,
                      23,
                      23,
                      21,
                      21,
                      23,
                      23,
                      24,
                      26,
                      26,
                      26,
                      26,
                      26,
                      26,
                      26,
                      28,
                      28,
                      28,
                      28
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    337,
                    333,
                    330,
                    313,
                    304,
                    290,
                    288,
                    279,
                    276,
                    275,
                    266,
                    263,
                    260,
                    255,
                    260,
                    257,
                    255,
                    255,
                    250,
                    249,
                    248,
                    249,
                    248,
                    250
                  ],
                  metric: {
                    values: [
                      10,
                      9,
                      9,
                      8,
                      8,
                      8,
                      8,
                      8,
                      8,
                      10,
                      10,
                      13,
                      13,
                      15,
                      15,
                      15,
                      15,
                      15,
                      16,
                      17,
                      19,
                      20,
                      21,
                      21
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      6,
                      5,
                      5,
                      4,
                      4,
                      4,
                      4,
                      4,
                      4,
                      6,
                      6,
                      8,
                      8,
                      9,
                      9,
                      9,
                      9,
                      9,
                      9,
                      10,
                      11,
                      12,
                      13,
                      13
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    33,
                    17,
                    17,
                    17,
                    24,
                    13,
                    24,
                    12,
                    12,
                    11,
                    7,
                    7,
                    6,
                    6,
                    6,
                    7,
                    35,
                    39,
                    43,
                    47,
                    46,
                    49,
                    49,
                    47
                  ]
                }
              }
            },
            {
              day: {
                weekday: 'Samstag',
                description: 'Vorm. Schneeschauer',
                icon: 'http://localhost:3000/static/images/snow.svg',
                date: 'Sa., 12. Jan.',
                precipitation: {
                  value: 40,
                  unit: '%',
                  label: 'Niederschlag'
                },
                temperature: {
                  metric: {
                    min: 1,
                    max: 2,
                    value: 2,
                    unit: '\u00b0C'
                  },
                  usc: {
                    min: 33,
                    max: 35,
                    value: 35,
                    unit: '\u00b0F'
                  },
                  label: 'Temperatur'
                },
                wind: {
                  metric: {
                    angle: 257,
                    value: 23,
                    unit: 'km/h'
                  },
                  usc: {
                    angle: 257,
                    value: 14,
                    unit: 'mph'
                  },
                  label: 'Wind'
                },
                humidity: {
                  value: 84,
                  unit: '%',
                  label: 'Feuchtigkeit'
                },
                uv: {
                  value: 0,
                  unit: '/ 10',
                  label: 'UV-index'
                }
              },
              hourly: {
                times: [
                  '00:00',
                  '01:00',
                  '02:00',
                  '03:00',
                  '04:00',
                  '05:00',
                  '06:00',
                  '07:00',
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                  '20:00',
                  '21:00',
                  '22:00',
                  '23:00'
                ],
                temperature: {
                  label: 'Temperatur',
                  metric: {
                    values: [
                      -2,
                      -1,
                      -1,
                      -1,
                      -1,
                      -1,
                      0,
                      0,
                      0,
                      0,
                      1,
                      1,
                      1,
                      1,
                      1,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2,
                      2
                    ],
                    unit: '\u00b0C'
                  },
                  usc: {
                    values: [
                      28,
                      30,
                      30,
                      30,
                      30,
                      30,
                      32,
                      32,
                      32,
                      32,
                      33,
                      33,
                      33,
                      33,
                      33,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35,
                      35
                    ],
                    unit: '\u00b0F'
                  }
                },
                wind: {
                  label: 'Wind',
                  angles: [
                    250,
                    253,
                    255,
                    254,
                    256,
                    260,
                    258,
                    260,
                    258,
                    259,
                    256,
                    257,
                    257,
                    255,
                    258,
                    255,
                    255,
                    256,
                    255,
                    256,
                    255,
                    255,
                    254,
                    254
                  ],
                  metric: {
                    values: [
                      21,
                      21,
                      22,
                      22,
                      22,
                      22,
                      22,
                      21,
                      20,
                      21,
                      21,
                      22,
                      22,
                      22,
                      22,
                      22,
                      23,
                      23,
                      23,
                      24,
                      25,
                      27,
                      28,
                      27
                    ],
                    unit: 'km/h'
                  },
                  usc: {
                    values: [
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      12,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      13,
                      14,
                      14,
                      14,
                      14,
                      15,
                      16,
                      17,
                      16
                    ],
                    unit: 'mph'
                  }
                },
                precipitation: {
                  label: 'Niederschlag',
                  unit: '%',
                  values: [
                    49,
                    42,
                    24,
                    37,
                    24,
                    24,
                    24,
                    24,
                    24,
                    24,
                    40,
                    39,
                    24,
                    12,
                    11,
                    11,
                    10,
                    10,
                    12,
                    15,
                    15,
                    15,
                    58,
                    71
                  ]
                }
              }
            }
          ]
        },
        forecast: [
          {
            desc: 'Rain',
            description: 'Rain',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/rain.gif',
            max: '6\u00b0',
            min: '-2\u00b0',
            weekday: 'Fri',
            minByUnit: {
              celsius: '14\u00b0',
              fahrenheit: '57\u00b0'
            },
            maxByUnit: {
              celsius: '24\u00b0',
              fahrenheit: '76\u00b0'
            }
          },
          {
            desc: 'Clear',
            description: 'Clear',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/clear.gif',
            max: '7\u00b0',
            min: '0\u00b0',
            weekday: 'Sat',
            minByUnit: {
              celsius: '12\u00b0',
              fahrenheit: '54\u00b0'
            },
            maxByUnit: {
              celsius: '19\u00b0',
              fahrenheit: '67\u00b0'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Partly Cloudy',
            icon: 'http://localhost:3000/static/images/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '11\u00b0',
            min: '0\u00b0',
            weekday: 'Sun',
            minByUnit: {
              celsius: '11\u00b0',
              fahrenheit: '52\u00b0'
            },
            maxByUnit: {
              celsius: '21\u00b0',
              fahrenheit: '70\u00b0'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Partly Cloudy',
            icon: 'http://localhost:3000/static/images/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '14\u00b0',
            min: '3\u00b0',
            weekday: 'Mon',
            minByUnit: {
              celsius: '13\u00b0',
              fahrenheit: '55\u00b0'
            },
            maxByUnit: {
              celsius: '23\u00b0',
              fahrenheit: '74\u00b0'
            }
          }
        ],
        meta: {
          cached_weather_data: 'yes',
          'lazy-RH': 0,
          'lazy-RH1': 0,
          'lazy-snpt1': 0,
          location: 'Munich, Germany',
          version: '21Dec15'
        },
        searched_city: 'Munich, Germany',
        searched_country: 'Germany - default',
        title_icon: 'http://localhost:3000/static/images/weather.svg',
        todayDesc: 'Overcast',
        todayDescription: 'Overcast',
        todayIcon: 'http://localhost:3000/static/images/cloudy.svg',
        todayIcon_bck: 'http://localhost:3000/static/images/cloudy.gif',
        todayMax: '19\u00b0',
        todayMin: '4\u00b0',
        todayTemp: '17\u00b0',
        todayWeekday: 'Today',
        todayMinByUnit: {
          celsius: '12\u00b0',
          fahrenheit: '53\u00b0'
        },
        todayMaxByUnit: {
          celsius: '22\u00b0',
          fahrenheit: '73\u00b0'
        },
        units_label: 'Scale'
      },
      friendlyUrl: 'weather.com',
      title: '> Title - München, Deutschland'
    },
    type: 'rh',
    subType: {
      class: 'EntityWeather',
      id: '8589837466389510234',
      name: 'weather EZ'
    },
    template: 'weatherEZ',
    trigger_method: 'query'
  },
  {
    url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
    snippet: {
      friendlyUrl: 'wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
      description: 'Get the Munich weather forecast. Access hourly, 10 day and 15 day forecasts along with up to the minute reports and videos for Munich, Germany from AccuWeather.com',
      extra: {
        alternatives: [
          'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167'
        ],
        language: {
          en: 0.8999999761581421
        },
        m_url: 'https://m.accuweather.com/en/de/munich/80331/weather-forecast/178086',
        og: {
          description: 'Get the Munich weather forecast. Access hourly, 10 day and 15 day forecasts along with up to the minute reports and videos for Munich, Germany from AccuWeather.com',
          image: 'https://vortex.accuweather.com/adc2010/images/awx-orange-sun-logo-650x315.png',
          title: '> Title - Munich Weather - AccuWeather Forecast for Bavaria Germany',
          type: 'website'
        }
      },
      title: '> Title - Munich Weather - AccuWeather Forecast for Bavaria Germany'
    },
    c_url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
    type: 'bm'
  },
];
