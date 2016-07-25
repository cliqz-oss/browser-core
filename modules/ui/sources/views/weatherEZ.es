/**
* @namespace ui.views
* @class WeatherEZ
*/
export default class {
  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {
    if (data.forecast_url) {
      data.btns = [
        {
          'title_key': 'extended_forecast',
          'url': data.forecast_url
        }
      ];
    }
  }
};
