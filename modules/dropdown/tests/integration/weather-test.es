import {
  blurUrlBar,
  checkMainResult,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  testsEnabled,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsWeather';

export default function () {
  if (!testsEnabled()) { return; }

  const forecastAreaSelector = '.forecast';
  const titleSelector = '.title';
  const forecastSelector = '.weather-item';
  const forecastDaySelector = '.weather-item .date';
  const forecastImageselector = '.weather-item img';
  const forecastTemperatureSelector = '.weather-item .temp';
  const sourceLinkSelector = '.source-link';

  context('for a weather forecast', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('wetter Mun');
      await waitForPopup(2, 1000);
    });

    after(function () {
      window.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, results });

    it('renders result with a correct title', function () {
      expect($cliqzResults.querySelector(titleSelector)).to.exist;
      expect($cliqzResults.querySelector(titleSelector))
        .to.have.text(results[0].snippet.title);
    });

    it('renders result with forecast', function () {
      expect($cliqzResults.querySelector(forecastAreaSelector)).to.exist;
    });

    it('renders result with a forecast for five days', function () {
      expect($cliqzResults.querySelectorAll(forecastSelector).length).to.equal(5);
    });

    it('renders result with a forecast for five days with correct days', function () {
      const forecastDays = $cliqzResults.querySelectorAll(forecastDaySelector);
      const [
        first,
        ...rest
      ] = [...forecastDays];
      expect(first).to.exist;
      expect(first).to.have.text(results[0].snippet.extra.todayWeekday);
      rest.forEach((day, i) => {
        expect(day).to.exist;
        expect(day).to.have.text(results[0].snippet.extra.forecast[i].weekday);
      });
    });

    it('renders result with a forecast for five days with existing images', function () {
      const $forecastImages = $cliqzResults.querySelectorAll(forecastImageselector);

      expect($forecastImages.length).to.equal(5);
      [...$forecastImages].forEach(function (image) {
        expect(image).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct images', function () {
      const $forecastImages = $cliqzResults.querySelectorAll(forecastImageselector);
      const [
        first,
        ...rest
      ] = [...$forecastImages];
      expect(first.src).to.equal(results[0].snippet.extra.todayIcon);
      rest.forEach((image, i) => {
        expect(image.src).to.equal(results[0].snippet.extra.forecast[i].icon);
      });
    });

    it('renders result with a forecast for five days with existing temperatures', function () {
      const $forecastTemps = $cliqzResults.querySelectorAll(forecastTemperatureSelector);
      expect($forecastTemps.length).to.equal(5);
    });

    it('renders result with a forecast for five days with correct temperatures', function () {
      const forecastTemperatures = $cliqzResults
        .querySelectorAll(forecastTemperatureSelector);
      const [
        first,
        ...rest
      ] = [...forecastTemperatures];
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
      expect($cliqzResults.querySelector(sourceLinkSelector)).to.exist;
    });

    it('renders result with a link with correct link to source', function () {
      const $sourceLink = $cliqzResults.querySelector(sourceLinkSelector);

      expect($sourceLink).to.exist;
      expect($sourceLink.href).to.equal(results[0].url);
    });
  });
}
