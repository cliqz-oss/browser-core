import {
  $cliqzResults,
  blurUrlBar,
  checkMainResult,
  expect,
  fillIn,
  mockSearch,
  waitForPopup,
  win,
  withHistory,
} from './helpers';
import results from '../../core/integration/fixtures/resultsWeather';

export default function () {
  const titleSelector = '.title';
  const forecastSelector = '.day';
  const forecastDaySelector = '.day .date';
  const forecastImageselector = '.day .day-weather .icon img';
  const forecastTemperatureSelector = '.day .degree';
  const sourceLinkSelector = '.source-link';

  context('for a weather forecast', function () {
    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
      await mockSearch({ results });
      withHistory([]);
      fillIn('weather Munich');
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

    it('renders result with usc button', async function () {
      const $unitsLabel = await $cliqzResults.querySelector('#usc');
      expect($unitsLabel).to.exist;
    });

    it('renders result with Metric button', async function () {
      const $unitsLabel = await $cliqzResults.querySelector('#metric');
      expect($unitsLabel).to.exist;
    });

    it('renders result with forecast', async function () {
      expect(await $cliqzResults.querySelector(forecastSelector)).to.exist;
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
      expect(first).to.have.text(results[0].snippet.extra.forecast_v2.forecast[0].day.date);
      rest.forEach((day, i) => {
        expect(day).to.exist;
        expect(day).to.have.text(results[0].snippet.extra.forecast_v2.forecast[i + 1].day.date);
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
      expect(first.src).to.equal(results[0].snippet.extra.forecast_v2.forecast[0].day.icon);
      rest.forEach((image, i) => {
        expect(image.src).to.equal(results[0].snippet.extra.forecast_v2.forecast[i].day.icon);
      });
    });

    it('renders result with a forecast for five days with existing temperatures', async function () {
      const $forecastTemps = await $cliqzResults.querySelectorAll(forecastSelector);
      expect($forecastTemps.length).to.equal(5);
    });

    it('renders result with a forecast for five days with correct default (celsius) temperatures', async function () {
      const forecastTemperatures = await $cliqzResults
        .querySelectorAll(forecastTemperatureSelector);
      const [
        first,
        ...rest
      ] = [...forecastTemperatures];
      expect(first).to.contain.text(
        results[0].snippet.extra.forecast_v2.forecast[0].day.temperature.metric.max
      );
      expect(first).to.contain.text(
        results[0].snippet.extra.forecast_v2.forecast[0].day.temperature.metric.min
      );
      rest.forEach((temp, i) => {
        expect(temp)
          .to.contain.text(
            results[0].snippet.extra.forecast_v2.forecast[i + 1].day.temperature.metric.max
          );
        expect(temp)
          .to.contain.text(
            results[0].snippet.extra.forecast_v2.forecast[i + 1].day.temperature.metric.min
          );
      });
    });

    it('renders result with a link with correct link to source', async function () {
      const $sourceLink = await $cliqzResults.querySelector(sourceLinkSelector);

      expect($sourceLink).to.exist;
      expect($sourceLink.href).to.contain(results[0].snippet.extra.forecast_v2.provider.url);
    });
  });
}
