export default class {
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
