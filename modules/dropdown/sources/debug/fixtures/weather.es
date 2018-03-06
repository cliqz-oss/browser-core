export default {
  'weather': {
    query: 'Weather Munich',
    results: [
      {
        'data': {
          'deepResults': [
            {
              'links': [
                {
                  'title': 'extended_forecast',
                  'url': 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833#forecast'
                }
              ],
              'type': 'buttons'
            }
          ],
          'extra': {
            'api_returned_location': 'Maxvorstadt, Germany',
            'forecast': [
              {
                'desc': 'Rain',
                'description': 'Rain',
                'icon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/rain.svg',
                'icon_bck': 'http://icons.wxug.com/i/c/k/rain.gif',
                'max': '6°',
                'min': '-2°',
                'weekday': 'Fri'
              },
              {
                'desc': 'Clear',
                'description': 'Clear',
                'icon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/clear---day.svg',
                'icon_bck': 'http://icons.wxug.com/i/c/k/clear.gif',
                'max': '7°',
                'min': '0°',
                'weekday': 'Sat'
              },
              {
                'desc': 'Partly Cloudy',
                'description': 'Partly Cloudy',
                'icon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
                'icon_bck': 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
                'max': '11°',
                'min': '0°',
                'weekday': 'Sun'
              },
              {
                'desc': 'Partly Cloudy',
                'description': 'Partly Cloudy',
                'icon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/mostly-sunny.svg',
                'icon_bck': 'http://icons.wxug.com/i/c/k/partlycloudy.gif',
                'max': '14°',
                'min': '3°',
                'weekday': 'Mon'
              }
            ],
            'meta': {
              'cached_weather_data': 'yes',
              'lazy-RH': 0,
              'lazy-RH1': 0,
              'lazy-snpt1': 0,
              'location': 'München, Deutschland',
              'version': '21Dec15'
            },
            'searched_city': 'münchen, Deutschland',
            'searched_country': 'Germany - default',
            'title_icon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/weather.svg',
            'todayDesc': 'Overcast',
            'todayDescription': 'Overcast',
            'todayIcon': 'http://cdn.cliqz.com/extension/EZ/weather-new2/cloudy.svg',
            'todayIcon_bck': 'http://icons.wxug.com/i/c/k/cloudy.gif',
            'todayMax': '19°',
            'todayMin': '4°',
            'todayTemp': '17°',
            'todayWeekday': 'Today'
          },
          'friendlyUrl': 'wunderground.com/cgi-bin/findweather/getforecast',
          'title': 'München, Deutschland',
          'subType': {
            'class': 'EntityWeather',
            'trigger_method': 'rh_query',
            'ez': 'deprecated',
            'i': 0,
            'cs': 0
          },
          'template': 'weatherEZ',
          'kind': [
            'X|{\'class\':\'EntityWeather\',\'trigger_method\':\'rh_query\',\'ez\':\'deprecated\',\'i\':0,\'cs\':0}'
          ]
        },
        'title': 'München, Deutschland',
        'url': 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833',
        'description': '',
        'originalUrl': 'https://www.wunderground.com/cgi-bin/findweather/getForecast?query=48.15,11.5833',
        'type': 'cliqz-extra',
        'text': 'weather m',
        'maxNumberOfSlots': 3
      }
    ]
  }
}
