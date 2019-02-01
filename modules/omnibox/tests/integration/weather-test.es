import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsWeather';

export default function () {
  const forecastAreaSelector = '.forecast';
  const fahrenheitForecastAreaSelector = '.forecast.fahrenheit-selected';
  const titleSelector = '.title';
  const unitsLabelSelector = '.unit-switcher span';
  const forecastSelector = '.weather-item';
  const forecastDaySelector = '.weather-item .date';
  const forecastImageselector = '.weather-item img';
  const forecastTemperatureSelector = '.weather-item .temp span.celsius';
  const forecastTemperatureFahrenheitSelector = '.weather-item .temp span.fahrenheit';
  const sourceLinkSelector = '.source-link';
  const fahrenheitBtnSelector = '.fahrenheit-btn';

  context('for a weather forecast', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('wetter Mun');
      await waitForPopup(1, 1000);
    });

    after(function () {
      win.preventRestarts = false;
    });

    checkMainResult({ $result: $cliqzResults, results });

    it('renders result with a correct title', async function () {
      const $title = await $cliqzResults.querySelector(titleSelector);
      expect($title).to.exist;
      expect($title).to.have.text(results[0].snippet.title);
    });

    it('renders result with a correct units label', async function () {
      const $unitsLabel = await $cliqzResults.querySelector(unitsLabelSelector);
      expect($unitsLabel).to.exist;
      expect($unitsLabel).to.contain.text(results[0].snippet.extra.units_label);
    });

    it('renders result with forecast', async function () {
      expect(await $cliqzResults.querySelector(forecastAreaSelector)).to.exist;
    });

    it('renders result with a forecast for five days', async function () {
      expect(await $cliqzResults.querySelectorAll(forecastSelector)).to.have.length(5);
    });

    it('renders result with a forecast for five days with correct days', async function () {
      const forecastDays = await $cliqzResults.querySelectorAll(forecastDaySelector);
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

    it('renders result with a forecast for five days with existing images', async function () {
      const $forecastImages = await $cliqzResults.querySelectorAll(forecastImageselector);

      expect($forecastImages.length).to.equal(5);
      [...$forecastImages].forEach(function (image) {
        expect(image).to.exist;
      });
    });

    it('renders result with a forecast for five days with correct images', async function () {
      const $forecastImages = await $cliqzResults.querySelectorAll(forecastImageselector);
      const [
        first,
        ...rest
      ] = [...$forecastImages];
      expect(first.src).to.equal(results[0].snippet.extra.todayIcon);
      rest.forEach((image, i) => {
        expect(image.src).to.equal(results[0].snippet.extra.forecast[i].icon);
      });
    });

    it('renders result with a forecast for five days with existing temperatures', async function () {
      const $forecastTemps = await $cliqzResults.querySelectorAll(forecastTemperatureSelector);
      expect($forecastTemps.length).to.equal(5);
    });

    it('renders result with a forecast for five days with correct default (celsius) temperatures', async function () {
      const forecastTemperatures = await $cliqzResults
        .querySelectorAll(forecastTemperatureSelector);
      const [
        first,
        ...rest
      ] = [...forecastTemperatures];
      expect(first).to.contain.text(results[0].snippet.extra.todayMaxByUnit.celsius);
      expect(first).to.contain.text(results[0].snippet.extra.todayMinByUnit.celsius);
      rest.forEach((temp, i) => {
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].maxByUnit.celsius);
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].minByUnit.celsius);
      });
    });

    xit('renders result with a forecast for five days with correct fahrenheit temperatures', async function () {
      // TODO: this click doesn't work
      await $cliqzResults.querySelector(fahrenheitBtnSelector).click();
      await waitFor(() => $cliqzResults.querySelector(fahrenheitForecastAreaSelector), 600);

      const forecastTemperatures = await $cliqzResults
        .querySelectorAll(forecastTemperatureFahrenheitSelector);
      const [
        first,
        ...rest
      ] = [...forecastTemperatures];
      expect(first).to.contain.text(results[0].snippet.extra.todayMaxByUnit.fahrenheit);
      expect(first).to.contain.text(results[0].snippet.extra.todayMinByUnit.fahrenheit);
      rest.forEach((temp, i) => {
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].maxByUnit.fahrenheit);
        expect(temp)
          .to.contain.text(results[0].snippet.extra.forecast[i].minByUnit.fahrenheit);
      });
    });

    it('renders result with a link to source', async function () {
      expect(await $cliqzResults.querySelector(sourceLinkSelector)).to.exist;
    });

    it('renders result with a link with correct link to source', async function () {
      const $sourceLink = await $cliqzResults.querySelector(sourceLinkSelector);

      expect($sourceLink).to.exist;
      expect($sourceLink.href).to.equal(results[0].url);
    });
  });
}
