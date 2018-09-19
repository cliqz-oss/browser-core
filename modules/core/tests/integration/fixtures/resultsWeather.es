export default [
  {
    url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'extended_forecast',
              url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.1500,11.5833#forecast'
            }
          ],
          type: 'buttons'
        }
      ],
      extra: {
        api_returned_location: 'Munchen, Germany',
        forecast: [
          {
            desc: 'Chance of Rain',
            description: 'Aussicht auf Regen',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/chance-of-rain.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/chancerain.gif',
            max: '22°',
            min: '12°',
            weekday: 'Mittwoch',
            minByUnit: {
              celsius: '14°',
              fahrenheit: '57°'
            },
            maxByUnit: {
              celsius: '24°',
              fahrenheit: '76°'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Teilweise bewölkt',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '24°',
            min: '13°',
            weekday: 'Donnerstag',
            minByUnit: {
              celsius: '12°',
              fahrenheit: '54°'
            },
            maxByUnit: {
              celsius: '19°',
              fahrenheit: '67°'
            }
          },
          {
            desc: 'Thunderstorm',
            description: 'Gewitter',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/thunderstorms.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/tstorms.gif',
            max: '28°',
            min: '16°',
            weekday: 'Freitag',
            minByUnit: {
              celsius: '11°',
              fahrenheit: '52°'
            },
            maxByUnit: {
              celsius: '21°',
              fahrenheit: '70°'
            }
          },
          {
            desc: 'Partly Cloudy',
            description: 'Teilweise bewölkt',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '27°',
            min: '14°',
            weekday: 'Samstag',
            minByUnit: {
              celsius: '13°',
              fahrenheit: '55°'
            },
            maxByUnit: {
              celsius: '23°',
              fahrenheit: '74°'
            }
          }
        ],
        meta: {
          cached_weather_data: 'yes',
          'lazy-RH': 0,
          'lazy-RH1': 0,
          'lazy-snpt1': 0,
          location: 'München, Deutschland',
          version: '21Dec15'
        },
        searched_city: 'münchen, Deutschland',
        searched_country: 'Germany - default',
        title_icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg',
        todayDesc: 'Mostly Cloudy',
        todayDescription: 'Zumeist bewölkt',
        todayIcon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-cloudy.svg',
        todayIcon_bck: 'http://icons.wxug.com/i/c/k/mostlycloudy.gif',
        todayMax: '22°',
        todayMin: '11°',
        todayTemp: '17°',
        todayWeekday: 'Heute',
        todayMinByUnit: {
          celsius: '12°',
          fahrenheit: '53°'
        },
        todayMaxByUnit: {
          celsius: '22°',
          fahrenheit: '73°'
        },
        units_label: 'Scale'
      },
      friendlyUrl: 'wunderground.com/cgi-bin/findweather/getforecast',
      title: 'München, Deutschland'
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
    url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=51.6167,13.3167',
    score: 0,
    snippet: {
      deepResults: [
        {
          links: [
            {
              title: 'extended_forecast',
              url: 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.1500,11.5833#forecast'
            }
          ],
          type: 'buttons'
        }
      ],
      extra: {
        api_returned_location: 'Munchen, Germany',
        forecast: [
          {
            desc: 'Chance of Rain',
            description: 'Aussicht auf Regen',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/chance-of-rain.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/chancerain.gif',
            max: '22°',
            min: '12°',
            weekday: 'Mittwoch'
          },
          {
            desc: 'Partly Cloudy',
            description: 'Teilweise bewölkt',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '24°',
            min: '13°',
            weekday: 'Donnerstag'
          },
          {
            desc: 'Thunderstorm',
            description: 'Gewitter',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/thunderstorms.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/tstorms.gif',
            max: '28°',
            min: '16°',
            weekday: 'Freitag'
          },
          {
            desc: 'Partly Cloudy',
            description: 'Teilweise bewölkt',
            icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
            icon_bck: 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
            max: '27°',
            min: '14°',
            weekday: 'Samstag'
          }
        ],
        meta: {
          cached_weather_data: 'yes',
          'lazy-RH': 0,
          'lazy-RH1': 0,
          'lazy-snpt1': 0,
          location: 'München, Deutschland',
          version: '21Dec15'
        },
        searched_city: 'münchen, Deutschland',
        searched_country: 'Germany - default',
        title_icon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg',
        todayDesc: 'Mostly Cloudy',
        todayDescription: 'Zumeist bewölkt',
        todayIcon: 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-cloudy.svg',
        todayIcon_bck: 'http://icons.wxug.com/i/c/k/mostlycloudy.gif',
        todayMax: '22°',
        todayMin: '11°',
        todayTemp: '17°',
        todayWeekday: 'Heute'
      },
      friendlyUrl: 'wunderground.com/cgi-bin/findweather/getforecast',
      title: 'München, Deutschland'
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
    url: 'https://www.accuweather.com/en/de/munich/80331/weather-forecast/178086',
    snippet: {
      description: 'Get the Munich weather forecast. Access hourly, 10 day and 15 day forecasts along with up to the minute reports and videos for Munich, Germany from AccuWeather.com',
      extra: {
        alternatives: [
          'https://www.accuweather.com/en/de/munich/80331/weather-forecast/178086'
        ],
        language: {
          en: 0.8999999761581421
        },
        m_url: 'https://m.accuweather.com/en/de/munich/80331/weather-forecast/178086',
        og: {
          description: 'Get the Munich weather forecast. Access hourly, 10 day and 15 day forecasts along with up to the minute reports and videos for Munich, Germany from AccuWeather.com',
          image: 'https://vortex.accuweather.com/adc2010/images/awx-orange-sun-logo-650x315.png',
          title: 'Munich Weather - AccuWeather Forecast for Bavaria Germany',
          type: 'website'
        }
      },
      title: 'Munich Weather - AccuWeather Forecast for Bavaria Germany'
    },
    c_url: 'https://www.accuweather.com/en/de/munich/80331/weather-forecast/178086',
    type: 'bm'
  },
];
