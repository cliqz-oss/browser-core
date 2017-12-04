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
  }
];
