import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsWeather';

export default function () {
  context('for a weather forecast', function () {
    let $resultElement;

    before(function () {
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('wetter Mun');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find('div.weather')[0];
      });
    });

    it('renders rich header result', function () {
      expect($resultElement).to.exist;
    });

    it('renders result with an existing and correct title', function () {
      const titleSelector = "span[class='title']";
      expect($resultElement.querySelector(titleSelector)).to.exist;
      expect($resultElement.querySelector(titleSelector))
        .to.have.text(results[0].snippet.title);
    });

    it('renders result with forecast', function () {
      const forecastSelector = '.forecast';
      expect($resultElement.querySelector(forecastSelector)).to.exist;
    });

    it('renders result with a forecast for five days', function () {
      const forecastItemsSelector = '.weather-item';
      expect($resultElement.querySelectorAll(forecastItemsSelector).length).to.equal(5);
    });

    it('renders result with a forecast for five days with existing and correct days', function () {
      const forecastItemsDaySelector = '.weather-item .date';
      const forecastItemsDays = $resultElement.querySelectorAll(forecastItemsDaySelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsDays];
      expect(first).to.exist;
      expect(first).to.have.text(results[0].snippet.extra.todayWeekday);
      rest.forEach((day, i) => {
        expect(day).to.exist;
        expect(day).to.have.text(results[0].snippet.extra.forecast[i].weekday);
      });
    });

    it('renders result with a forecast for five days with existing images', function () {
      const forecastItemsImageSelector = '.weather-item img';
      const forecastItemsImages = $resultElement.querySelectorAll(forecastItemsImageSelector);
      expect($resultElement.querySelectorAll(forecastItemsImageSelector).length).to.equal(5);
      [].forEach.call(forecastItemsImages, function (image) {
        expect(image).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct images', function () {
      const forecastItemsImageSelector = '.weather-item img';
      const forecastItemsImages = $resultElement.querySelectorAll(forecastItemsImageSelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsImages];
      expect(first.src)
        .to.equal(results[0].snippet.extra.todayIcon);
      rest.forEach((image, i) => {
        expect(image.src)
          .to.equal(results[0].snippet.extra.forecast[i].icon);
      });
    });

    it('renders result with a forecast for five days with existing temperatures', function () {
      const forecastItemsTempSelector = '.weather-item .temp';
      const forecastItemsTemps = $resultElement.querySelectorAll(forecastItemsTempSelector);
      expect($resultElement.querySelectorAll(forecastItemsTempSelector).length).to.equal(5);
      [].forEach.call(forecastItemsTemps, function (div) {
        expect(div).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct temperatures', function () {
      const forecastItemsTemperatureSelector = '.weather-item .temp';
      const forecastItemsTemperatures = $resultElement
        .querySelectorAll(forecastItemsTemperatureSelector);
      const [
        first,
        ...rest
      ] = [...forecastItemsTemperatures];
      expect(first).to.contain.text(results[0].snippet.extra.todayMax);
      expect(first).to.contain.text(results[0].snippet.extra.todayMin);
      rest.forEach((temp, i) => {
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].max);
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].min);
      });
    });

    it('renders result with a link to source', function () {
      const sourceLinkSelector = '.source-link';
      expect($resultElement.querySelector(sourceLinkSelector)).to.exist;
    });

    it('renders result with a link with correct link to source', function () {
      const sourceLinkSelector = '.source-link';
      const sourceLink = $resultElement.querySelector(sourceLinkSelector);
      expect(sourceLink.dataset.url).to.equal(results[0].url);
    });
  });
}
