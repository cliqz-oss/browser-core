/* global chai, chai-dom, it, expect, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a weather forecast', function () {
    const results = [
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
    let resultElement;

    beforeEach(function () {
      respondWith({ results });
      fillIn('wetter Mun');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find('div.weather')[0];
      });
    });

    it('renders rich header result', function () {
      chai.expect(resultElement).to.exist;
    });

    it('renders result with an existing and correct title', function () {
      const titleSelector = "span[class='title']";
      chai.expect(resultElement.querySelector(titleSelector)).to.exist;
      chai.expect(resultElement.querySelector(titleSelector))
        .to.have.text(results[0].snippet.title);
    });

    it('renders result with forecast', function () {
      const forecastSelector = '.forecast';
      chai.expect(resultElement.querySelector(forecastSelector)).to.exist;
    });

    it('renders result with a forecast for five days', function () {
      const forecastItemsSelector = '.weather-item';
      chai.expect(resultElement.querySelectorAll(forecastItemsSelector).length).to.equal(5);
    });

    it('renders result with a forecast for five days with existing and correct days', function () {
      const forecastItemsDaySelector = '.weather-item .date';
      const forecastItemsDays = resultElement.querySelectorAll(forecastItemsDaySelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsDays];
      chai.expect(first).to.exist;
      chai.expect(first).to.have.text(results[0].snippet.extra.todayWeekday);
      rest.forEach((day, i) => {
        chai.expect(day).to.exist;
        chai.expect(day).to.have.text(results[0].snippet.extra.forecast[i].weekday);
      });
    });

    it('renders result with a forecast for five days with existing images', function () {
      const forecastItemsImageSelector = '.weather-item img';
      const forecastItemsImages = resultElement.querySelectorAll(forecastItemsImageSelector);
      chai.expect(resultElement.querySelectorAll(forecastItemsImageSelector).length).to.equal(5);
      [].forEach.call(forecastItemsImages, function (image) {
        chai.expect(image).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct images', function () {
      const forecastItemsImageSelector = '.weather-item img';
      const forecastItemsImages = resultElement.querySelectorAll(forecastItemsImageSelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsImages];
      chai.expect(first.src)
        .to.equal(results[0].snippet.extra.todayIcon);
      rest.forEach((image, i) => {
        chai.expect(image.src)
          .to.equal(results[0].snippet.extra.forecast[i].icon);
      });
    });

    it('renders result with a forecast for five days with existing temperatures', function () {
      const forecastItemsTempSelector = '.weather-item .temp';
      const forecastItemsTemps = resultElement.querySelectorAll(forecastItemsTempSelector);
      chai.expect(resultElement.querySelectorAll(forecastItemsTempSelector).length).to.equal(5);
      [].forEach.call(forecastItemsTemps, function (div) {
        chai.expect(div).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct temperatures', function () {
      const forecastItemsTemperatureSelector = '.weather-item .temp';
      const forecastItemsTemperatures = resultElement
        .querySelectorAll(forecastItemsTemperatureSelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsTemperatures];
      chai.expect(first).to.contain.text(results[0].snippet.extra.todayMax);
      chai.expect(first).to.contain.text(results[0].snippet.extra.todayMin);
      rest.forEach((temp, i) => {
        chai.expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].max);
        chai.expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].min);
      });
    });

    it('renders result with a link to source', function () {
      const sourceLinkSelector = '.source-link';
      chai.expect(resultElement.querySelector(sourceLinkSelector)).to.exist;
    });

    it('renders result with a link with correct link to source', function () {
      const sourceLinkSelector = '.source-link';
      const sourceLink = resultElement.querySelector(sourceLinkSelector);
      chai.expect(sourceLink.href).to.equal(results[0].url);
    });
  });
}
