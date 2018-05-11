/* global chai, it, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from './fixtures/resultsWeather';

export default function () {
  context('for a weather forecast', function () {
    let resultElement;

    before(function () {
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
