export default {
  weather: {
    query: 'Weather Munich',
    results: [
      {
        data: {
          deepResults: [
            {
              links: [
                {
                  title: 'extended_forecast',
                  url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833#forecast'
                }
              ],
              type: 'buttons'
            }
          ],
          extra: {
            api_returned_location: 'Maxvorstadt, Germany',
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
                icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
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
                icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
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
            title_icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg',
            todayDesc: 'Overcast',
            todayDescription: 'Overcast',
            todayIcon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/cloudy.svg',
            todayIcon_bck: 'http://icons.wxug.com/i/c/k/cloudy.gif',
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
          title: 'Munich, Germany',
          subType: {
            class: 'EntityWeather',
            trigger_method: 'rh_query',
            ez: 'deprecated',
            i: 0,
            cs: 0
          },
          template: 'weatherEZ',
          kind: [
            'X|{\'class\':\'EntityWeather\',\'trigger_method\':\'rh_query\',\'ez\':\'deprecated\',\'i\':0,\'cs\':0}'
          ]
        },
        title: 'Munich, Germany',
        url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833',
        description: '',
        originalUrl: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833',
        type: 'cliqz-extra',
        text: 'weather m',
        maxNumberOfSlots: 3
      }
    ]
  }
};
