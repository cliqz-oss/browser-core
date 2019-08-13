export default {
  weather: {
    query: 'Weather Munich',
    results: [
      {
        url: 'https://weather.com/weather/today/l/48.133,11.567?par=cliqz',
        href: 'https://weather.com/weather/today/l/48.133,11.567?par=cliqz',
        friendlyUrl: 'weather.com/weather/today/l/48.133,11.567',
        title: 'Munich, Germany',
        kind: [
          'X|{"class":"EntityWeather"}'
        ],
        provider: 'cliqz',
        template: 'weatherEZ',
        text: 'weather munich',
        type: 'rh',
        meta: {
          level: 0,
          type: 'main',
          triggerMethod: 'partial_url',
          domain: 'weather.com',
          host: 'weather.com',
          hostAndPort: 'weather.com',
          port: '',
          url: 'weather.com/weather/today/l/48.133,11.567?par=cliqz',
          score: 0,
          subType: {
            class: 'EntityWeather',
            id: 'c0a7d57384563b98df52e41eb4c412002218cb2c9a6572e696a3022e631033f6',
            name: 'AccuweatherUrlParser'
          },
          latency: 142,
          backendCountry: 'de',
          completion: '',
          logo: {
            backgroundColor: '1747a6',
            backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/weather/$.com.svg)',
            text: 'we',
            color: '#fff',
            brandTxtColor: '1747a6',
            buttonsClass: 'cliqz-brands-button-6',
            style: 'background-color: #1747a6;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/weather/$.com.svg); text-indent: -10em;'
          },
          extraLogos: {},
          externalProvidersLogos: {
            kicker: {
              backgroundColor: 'd7011d',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg)',
              text: 'ki',
              color: '#fff',
              brandTxtColor: 'd7011d',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #d7011d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1554882466943/logos/kicker/$.svg); text-indent: -10em;'
            }
          }
        },
        data: {
          deepResults: [],
          extra: {
            api_returned_location: 'Munich, Germany',
            forecast: [
              {
                desc: 'Few Showers',
                description: 'Few Showers',
                icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                icon_bck: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                max: '17°',
                maxByUnit: {
                  celsius: '17°',
                  fahrenheit: '62°'
                },
                min: '8°',
                minByUnit: {
                  celsius: '8°',
                  fahrenheit: '46°'
                },
                weekday: 'Friday'
              },
              {
                desc: 'Thundershowers',
                description: 'Thundershowers',
                icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                icon_bck: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                max: '16°',
                maxByUnit: {
                  celsius: '16°',
                  fahrenheit: '60°'
                },
                min: '6°',
                minByUnit: {
                  celsius: '6°',
                  fahrenheit: '42°'
                },
                weekday: 'Saturday'
              },
              {
                desc: 'Showers',
                description: 'Showers',
                icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                icon_bck: 'https://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                max: '10°',
                maxByUnit: {
                  celsius: '10°',
                  fahrenheit: '50°'
                },
                min: '4°',
                minByUnit: {
                  celsius: '4°',
                  fahrenheit: '39°'
                },
                weekday: 'Sunday'
              },
              {
                desc: 'Mostly Cloudy',
                description: 'Mostly Cloudy',
                icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/mostly-cloudy.svg',
                icon_bck: 'https://cdn.cliqz.com/extension/EZ/weather-new2/mostly-cloudy.svg',
                max: '11°',
                maxByUnit: {
                  celsius: '11°',
                  fahrenheit: '51°'
                },
                min: '5°',
                minByUnit: {
                  celsius: '5°',
                  fahrenheit: '41°'
                },
                weekday: 'Monday'
              }
            ],
            forecast_description: 'Extended forecast',
            forecast_v2: {
              alt_unit: 'usc',
              default_unit: 'metric',
              forecast: [
                {
                  day: {
                    date: 'Thu, 9 May',
                    description: 'Fair',
                    humidity: {
                      label: 'Humidity',
                      unit: '%',
                      value: 66
                    },
                    icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/34_Fair-:-Mostly-Sunny.svg',
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      value: 0
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        max: 18,
                        min: 7,
                        unit: '°C',
                        value: 11
                      },
                      usc: {
                        max: 64,
                        min: 44,
                        unit: '°F',
                        value: 51
                      }
                    },
                    uv: {
                      label: 'UV-index',
                      unit: '/10',
                      value: 2
                    },
                    weekday: 'Thursday',
                    wind: {
                      label: 'Wind',
                      metric: {
                        angle: 230,
                        unit: 'km/h',
                        value: 11
                      },
                      usc: {
                        angle: 230,
                        unit: 'mph',
                        value: 6
                      }
                    }
                  },
                  hourly: {
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      values: [
                        0,
                        0,
                        1,
                        33,
                        34,
                        59,
                        68,
                        42,
                        45,
                        20,
                        3,
                        20,
                        15,
                        36,
                        35,
                        24,
                        5,
                        5,
                        6,
                        6,
                        6,
                        5,
                        13,
                        10
                      ]
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        unit: '°C',
                        values: [
                          12,
                          14,
                          14,
                          15,
                          14,
                          15,
                          15,
                          14,
                          14,
                          13,
                          13,
                          12,
                          12,
                          11,
                          11,
                          11,
                          10,
                          10,
                          10,
                          9,
                          9,
                          10,
                          11,
                          12
                        ]
                      },
                      usc: {
                        unit: '°F',
                        values: [
                          53,
                          57,
                          57,
                          59,
                          57,
                          59,
                          59,
                          57,
                          57,
                          55,
                          55,
                          53,
                          53,
                          51,
                          51,
                          51,
                          50,
                          50,
                          50,
                          48,
                          48,
                          50,
                          51,
                          53
                        ]
                      }
                    },
                    times: [
                      '10:00 am',
                      '11:00 am',
                      '12:00 pm',
                      '1:00 pm',
                      '2:00 pm',
                      '3:00 pm',
                      '4:00 pm',
                      '5:00 pm',
                      '6:00 pm',
                      '7:00 pm',
                      '8:00 pm',
                      '9:00 pm',
                      '10:00 pm',
                      '11:00 pm',
                      '0:00 am',
                      '1:00 am',
                      '2:00 am',
                      '3:00 am',
                      '4:00 am',
                      '5:00 am',
                      '6:00 am',
                      '7:00 am',
                      '8:00 am',
                      '9:00 am'
                    ],
                    wind: {
                      angles: [
                        248,
                        249,
                        249,
                        253,
                        257,
                        258,
                        257,
                        258,
                        257,
                        251,
                        252,
                        252,
                        250,
                        251,
                        252,
                        251,
                        249,
                        250,
                        254,
                        252,
                        250,
                        250,
                        254,
                        260
                      ],
                      label: 'Wind',
                      metric: {
                        unit: 'km/h',
                        values: [
                          12,
                          13,
                          14,
                          16,
                          16,
                          18,
                          24,
                          24,
                          25,
                          23,
                          22,
                          22,
                          21,
                          21,
                          21,
                          20,
                          19,
                          19,
                          17,
                          16,
                          15,
                          15,
                          16,
                          17
                        ]
                      },
                      usc: {
                        unit: 'mph',
                        values: [
                          7,
                          8,
                          8,
                          9,
                          9,
                          11,
                          14,
                          14,
                          15,
                          14,
                          13,
                          13,
                          13,
                          13,
                          13,
                          12,
                          11,
                          11,
                          10,
                          9,
                          9,
                          9,
                          9,
                          10
                        ]
                      }
                    }
                  }
                },
                {
                  day: {
                    date: 'Fri, 10 May',
                    description: 'Few Showers',
                    humidity: {
                      label: 'Humidity',
                      unit: '%',
                      value: 54
                    },
                    icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/11_light-rain.svg',
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      value: 30
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        max: 17,
                        min: 8,
                        unit: '°C',
                        value: 17
                      },
                      usc: {
                        max: 62,
                        min: 46,
                        unit: '°F',
                        value: 62
                      }
                    },
                    uv: {
                      label: 'UV-index',
                      unit: '/10',
                      value: 6
                    },
                    weekday: 'Friday',
                    wind: {
                      label: 'Wind',
                      metric: {
                        angle: 270,
                        unit: 'km/h',
                        value: 18
                      },
                      usc: {
                        angle: 270,
                        unit: 'mph',
                        value: 11
                      }
                    }
                  },
                  hourly: {
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      values: [
                        35,
                        24,
                        5,
                        5,
                        6,
                        6,
                        6,
                        5,
                        13,
                        10,
                        33,
                        32,
                        34,
                        30,
                        13,
                        15,
                        20,
                        18,
                        32,
                        18,
                        14,
                        8,
                        5,
                        11
                      ]
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        unit: '°C',
                        values: [
                          11,
                          11,
                          10,
                          10,
                          10,
                          9,
                          9,
                          10,
                          11,
                          12,
                          12,
                          13,
                          14,
                          15,
                          15,
                          16,
                          16,
                          16,
                          16,
                          15,
                          14,
                          13,
                          12,
                          11
                        ]
                      },
                      usc: {
                        unit: '°F',
                        values: [
                          51,
                          51,
                          50,
                          50,
                          50,
                          48,
                          48,
                          50,
                          51,
                          53,
                          53,
                          55,
                          57,
                          59,
                          59,
                          60,
                          60,
                          60,
                          60,
                          59,
                          57,
                          55,
                          53,
                          51
                        ]
                      }
                    },
                    times: [
                      '0:00 am',
                      '1:00 am',
                      '2:00 am',
                      '3:00 am',
                      '4:00 am',
                      '5:00 am',
                      '6:00 am',
                      '7:00 am',
                      '8:00 am',
                      '9:00 am',
                      '10:00 am',
                      '11:00 am',
                      '12:00 pm',
                      '1:00 pm',
                      '2:00 pm',
                      '3:00 pm',
                      '4:00 pm',
                      '5:00 pm',
                      '6:00 pm',
                      '7:00 pm',
                      '8:00 pm',
                      '9:00 pm',
                      '10:00 pm',
                      '11:00 pm'
                    ],
                    wind: {
                      angles: [
                        252,
                        251,
                        249,
                        250,
                        254,
                        252,
                        250,
                        250,
                        254,
                        260,
                        264,
                        269,
                        270,
                        269,
                        270,
                        283,
                        281,
                        282,
                        286,
                        291,
                        298,
                        297,
                        202,
                        197
                      ],
                      label: 'Wind',
                      metric: {
                        unit: 'km/h',
                        values: [
                          21,
                          20,
                          19,
                          19,
                          17,
                          16,
                          15,
                          15,
                          16,
                          17,
                          18,
                          18,
                          17,
                          18,
                          18,
                          18,
                          18,
                          17,
                          14,
                          11,
                          7,
                          4,
                          4,
                          5
                        ]
                      },
                      usc: {
                        unit: 'mph',
                        values: [
                          13,
                          12,
                          11,
                          11,
                          10,
                          9,
                          9,
                          9,
                          9,
                          10,
                          11,
                          11,
                          10,
                          11,
                          11,
                          11,
                          11,
                          10,
                          8,
                          6,
                          4,
                          2,
                          2,
                          3
                        ]
                      }
                    }
                  }
                },
                {
                  day: {
                    date: 'Sat, 11 May',
                    description: 'Thundershowers',
                    humidity: {
                      label: 'Humidity',
                      unit: '%',
                      value: 65
                    },
                    icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/11_light-rain.svg',
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      value: 90
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        max: 16,
                        min: 6,
                        unit: '°C',
                        value: 16
                      },
                      usc: {
                        max: 60,
                        min: 42,
                        unit: '°F',
                        value: 60
                      }
                    },
                    uv: {
                      label: 'UV-index',
                      unit: '/10',
                      value: 3
                    },
                    weekday: 'Saturday',
                    wind: {
                      label: 'Wind',
                      metric: {
                        angle: 244,
                        unit: 'km/h',
                        value: 21
                      },
                      usc: {
                        angle: 244,
                        unit: 'mph',
                        value: 13
                      }
                    }
                  },
                  hourly: {
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      values: [
                        30,
                        6,
                        36,
                        34,
                        31,
                        46,
                        66,
                        60,
                        35,
                        11,
                        20,
                        64,
                        80,
                        92,
                        77,
                        88,
                        92,
                        84,
                        78,
                        68,
                        65,
                        53,
                        35,
                        33
                      ]
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        unit: '°C',
                        values: [
                          10,
                          10,
                          10,
                          10,
                          9,
                          9,
                          9,
                          10,
                          11,
                          13,
                          15,
                          16,
                          16,
                          16,
                          16,
                          14,
                          14,
                          13,
                          13,
                          13,
                          12,
                          11,
                          11,
                          10
                        ]
                      },
                      usc: {
                        unit: '°F',
                        values: [
                          50,
                          50,
                          50,
                          50,
                          48,
                          48,
                          48,
                          50,
                          51,
                          55,
                          59,
                          60,
                          60,
                          60,
                          60,
                          57,
                          57,
                          55,
                          55,
                          55,
                          53,
                          51,
                          51,
                          50
                        ]
                      }
                    },
                    times: [
                      '0:00 am',
                      '1:00 am',
                      '2:00 am',
                      '3:00 am',
                      '4:00 am',
                      '5:00 am',
                      '6:00 am',
                      '7:00 am',
                      '8:00 am',
                      '9:00 am',
                      '10:00 am',
                      '11:00 am',
                      '12:00 pm',
                      '1:00 pm',
                      '2:00 pm',
                      '3:00 pm',
                      '4:00 pm',
                      '5:00 pm',
                      '6:00 pm',
                      '7:00 pm',
                      '8:00 pm',
                      '9:00 pm',
                      '10:00 pm',
                      '11:00 pm'
                    ],
                    wind: {
                      angles: [
                        193,
                        188,
                        173,
                        167,
                        165,
                        152,
                        156,
                        163,
                        174,
                        215,
                        244,
                        256,
                        259,
                        262,
                        261,
                        267,
                        262,
                        260,
                        258,
                        246,
                        246,
                        252,
                        258,
                        259
                      ],
                      label: 'Wind',
                      metric: {
                        unit: 'km/h',
                        values: [
                          6,
                          6,
                          6,
                          6,
                          6,
                          7,
                          7,
                          8,
                          8,
                          10,
                          13,
                          16,
                          18,
                          21,
                          22,
                          21,
                          20,
                          19,
                          19,
                          17,
                          15,
                          15,
                          16,
                          17
                        ]
                      },
                      usc: {
                        unit: 'mph',
                        values: [
                          3,
                          3,
                          3,
                          3,
                          3,
                          4,
                          4,
                          4,
                          4,
                          6,
                          8,
                          9,
                          11,
                          13,
                          13,
                          13,
                          12,
                          11,
                          11,
                          10,
                          9,
                          9,
                          9,
                          10
                        ]
                      }
                    }
                  }
                },
                {
                  day: {
                    date: 'Sun, 12 May',
                    description: 'Showers',
                    humidity: {
                      label: 'Humidity',
                      unit: '%',
                      value: 64
                    },
                    icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/11_light-rain.svg',
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      value: 50
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        max: 10,
                        min: 4,
                        unit: '°C',
                        value: 10
                      },
                      usc: {
                        max: 50,
                        min: 39,
                        unit: '°F',
                        value: 50
                      }
                    },
                    uv: {
                      label: 'UV-index',
                      unit: '/10',
                      value: 3
                    },
                    weekday: 'Sunday',
                    wind: {
                      label: 'Wind',
                      metric: {
                        angle: 329,
                        unit: 'km/h',
                        value: 19
                      },
                      usc: {
                        angle: 329,
                        unit: 'mph',
                        value: 11
                      }
                    }
                  },
                  hourly: {
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      values: [
                        36,
                        40,
                        43,
                        46,
                        62,
                        76,
                        74,
                        48,
                        36,
                        39,
                        46,
                        46,
                        44,
                        42,
                        42,
                        38,
                        32,
                        31,
                        35,
                        23,
                        19,
                        8,
                        9,
                        7
                      ]
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        unit: '°C',
                        values: [
                          10,
                          9,
                          9,
                          8,
                          8,
                          7,
                          7,
                          6,
                          7,
                          7,
                          8,
                          8,
                          9,
                          9,
                          9,
                          9,
                          10,
                          10,
                          10,
                          10,
                          10,
                          9,
                          8,
                          8
                        ]
                      },
                      usc: {
                        unit: '°F',
                        values: [
                          50,
                          48,
                          48,
                          46,
                          46,
                          44,
                          44,
                          42,
                          44,
                          44,
                          46,
                          46,
                          48,
                          48,
                          48,
                          48,
                          50,
                          50,
                          50,
                          50,
                          50,
                          48,
                          46,
                          46
                        ]
                      }
                    },
                    times: [
                      '0:00 am',
                      '1:00 am',
                      '2:00 am',
                      '3:00 am',
                      '4:00 am',
                      '5:00 am',
                      '6:00 am',
                      '7:00 am',
                      '8:00 am',
                      '9:00 am',
                      '10:00 am',
                      '11:00 am',
                      '12:00 pm',
                      '1:00 pm',
                      '2:00 pm',
                      '3:00 pm',
                      '4:00 pm',
                      '5:00 pm',
                      '6:00 pm',
                      '7:00 pm',
                      '8:00 pm',
                      '9:00 pm',
                      '10:00 pm',
                      '11:00 pm'
                    ],
                    wind: {
                      angles: [
                        268,
                        271,
                        275,
                        281,
                        285,
                        287,
                        292,
                        292,
                        298,
                        305,
                        316,
                        322,
                        333,
                        341,
                        338,
                        347,
                        348,
                        347,
                        352,
                        355,
                        342,
                        335,
                        331,
                        328
                      ],
                      label: 'Wind',
                      metric: {
                        unit: 'km/h',
                        values: [
                          18,
                          18,
                          17,
                          17,
                          19,
                          19,
                          19,
                          19,
                          18,
                          19,
                          18,
                          18,
                          17,
                          18,
                          18,
                          18,
                          18,
                          17,
                          15,
                          11,
                          9,
                          8,
                          8,
                          8
                        ]
                      },
                      usc: {
                        unit: 'mph',
                        values: [
                          11,
                          11,
                          10,
                          10,
                          11,
                          11,
                          11,
                          11,
                          11,
                          11,
                          11,
                          11,
                          10,
                          11,
                          11,
                          11,
                          11,
                          10,
                          9,
                          6,
                          5,
                          4,
                          4,
                          4
                        ]
                      }
                    }
                  }
                },
                {
                  day: {
                    date: 'Mon, 13 May',
                    description: 'Mostly Cloudy',
                    humidity: {
                      label: 'Humidity',
                      unit: '%',
                      value: 53
                    },
                    icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/28_Mostly-Cloudy.svg',
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      value: 20
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        max: 11,
                        min: 5,
                        unit: '°C',
                        value: 11
                      },
                      usc: {
                        max: 51,
                        min: 41,
                        unit: '°F',
                        value: 51
                      }
                    },
                    uv: {
                      label: 'UV-index',
                      unit: '/10',
                      value: 5
                    },
                    weekday: 'Monday',
                    wind: {
                      label: 'Wind',
                      metric: {
                        angle: 32,
                        unit: 'km/h',
                        value: 15
                      },
                      usc: {
                        angle: 32,
                        unit: 'mph',
                        value: 9
                      }
                    }
                  },
                  hourly: {
                    precipitation: {
                      label: 'Precipitation',
                      unit: '%',
                      values: [
                        8,
                        8,
                        8,
                        8,
                        9,
                        22,
                        23,
                        23,
                        10,
                        9,
                        6,
                        4,
                        3,
                        3,
                        3,
                        3,
                        3,
                        7,
                        10,
                        4,
                        5,
                        6,
                        7,
                        7
                      ]
                    },
                    temperature: {
                      label: 'Temperature',
                      metric: {
                        unit: '°C',
                        values: [
                          7,
                          7,
                          6,
                          6,
                          6,
                          5,
                          5,
                          5,
                          6,
                          7,
                          8,
                          9,
                          10,
                          10,
                          11,
                          10,
                          10,
                          10,
                          10,
                          10,
                          10,
                          8,
                          8,
                          7
                        ]
                      },
                      usc: {
                        unit: '°F',
                        values: [
                          44,
                          44,
                          42,
                          42,
                          42,
                          41,
                          41,
                          41,
                          42,
                          44,
                          46,
                          48,
                          50,
                          50,
                          51,
                          50,
                          50,
                          50,
                          50,
                          50,
                          50,
                          46,
                          46,
                          44
                        ]
                      }
                    },
                    times: [
                      '0:00 am',
                      '1:00 am',
                      '2:00 am',
                      '3:00 am',
                      '4:00 am',
                      '5:00 am',
                      '6:00 am',
                      '7:00 am',
                      '8:00 am',
                      '9:00 am',
                      '10:00 am',
                      '11:00 am',
                      '12:00 pm',
                      '1:00 pm',
                      '2:00 pm',
                      '3:00 pm',
                      '4:00 pm',
                      '5:00 pm',
                      '6:00 pm',
                      '7:00 pm',
                      '8:00 pm',
                      '9:00 pm',
                      '10:00 pm',
                      '11:00 pm'
                    ],
                    wind: {
                      angles: [
                        338,
                        347,
                        353,
                        354,
                        357,
                        5,
                        13,
                        17,
                        19,
                        23,
                        28,
                        32,
                        37,
                        41,
                        38,
                        34,
                        40,
                        38,
                        45,
                        56,
                        53,
                        55,
                        53,
                        48
                      ],
                      label: 'Wind',
                      metric: {
                        unit: 'km/h',
                        values: [
                          8,
                          8,
                          8,
                          8,
                          7,
                          7,
                          8,
                          9,
                          9,
                          12,
                          12,
                          13,
                          13,
                          15,
                          15,
                          15,
                          16,
                          15,
                          14,
                          11,
                          9,
                          8,
                          8,
                          8
                        ]
                      },
                      usc: {
                        unit: 'mph',
                        values: [
                          4,
                          4,
                          4,
                          4,
                          4,
                          4,
                          4,
                          5,
                          5,
                          7,
                          7,
                          8,
                          8,
                          9,
                          9,
                          9,
                          9,
                          9,
                          8,
                          6,
                          5,
                          4,
                          4,
                          4
                        ]
                      }
                    }
                  }
                }
              ],
              forecast_description: 'Extended forecast',
              hourly_forecast_url: 'https://weather.com/weather/hourbyhour/l/48.133,11.567?par=cliqz',
              provider: {
                name: 'weather.com',
                url: 'https://www.weather.com'
              },
              units_label: 'Scale'
            },
            meta: {
              location: 'Munich, Germany'
            },
            searched_city: 'Munich, Germany',
            searched_country: 'Germany',
            title_icon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg',
            todayDesc: 'Fair',
            todayDescription: 'Fair',
            todayIcon: 'https://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
            todayMax: '18°',
            todayMaxByUnit: {
              celsius: '18°',
              fahrenheit: '64°'
            },
            todayMin: '7°',
            todayMinByUnit: {
              celsius: '7°',
              fahrenheit: '44°'
            },
            todayTemp: '11°',
            todayTempByUnit: {
              celsius: '11°',
              fahrenheit: '51°'
            },
            todayWeekday: 'Thursday',
            units_label: 'Scale'
          },
          kind: [
            'X|{"class":"EntityWeather"}'
          ],
          template: 'weatherEZ'
        }
      },
    ]
  }
};
