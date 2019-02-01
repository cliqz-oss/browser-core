import {
  closeTab,
  expect,
  newTab,
  queryComputedStyle,
  waitForElement,
  win,
} from '../../../tests/core/integration/helpers';

import {
  cardsUrl,
  checkComplementarySearchCard,
  checkHeader,
  checkMainUrl,
  checkMoreOn,
  getElements,
  mockSearch,
  withHistory,
} from './helpers';

import results from '../../../tests/core/integration/fixtures/resultsWeather';

import { isWebExtension } from '../../../core/platform';

export default function () {
  if (!isWebExtension) {
    return;
  }

  describe('for a weather mobile cards result', function () {
    let id;

    before(async function () {
      win.preventRestarts = true;

      id = await newTab(cardsUrl);
      withHistory([]);
      await mockSearch({ results });
      win.CLIQZ.app.modules.search.action('startSearch', 'wetter Mu', { tab: { id } });
      await waitForElement({
        url: cardsUrl,
        selector: '[aria-label="mobile-result"]',
        isPresent: true
      });
    });

    after(async function () {
      await closeTab(id);
      win.preventRestarts = false;
      win.CLIQZ.app.modules.search.action('stopSearch');
    });

    checkMainUrl({ url: cardsUrl, mainUrl: results[0].url });
    checkHeader({ url: cardsUrl, results, imageName: 'wunderground' });

    it('renders correct title', async function () {
      const $titles = await getElements({
        elementSelector: '[aria-label="generic-title"]',
        url: cardsUrl,
      });

      expect($titles).to.have.length(1);
      expect($titles[0].textContent).to.equal(results[0].snippet.title);
    });

    it('renders forecast for 5 days', async function () {
      const $days = await getElements({
        elementSelector: '[aria-label="weather-item"]',
        url: cardsUrl,
      });

      expect($days).to.have.length(5);
    });

    context('each forecast day', function () {
      it('renders with correct name', async function () {
        const $forecastNames = await getElements({
          elementSelector: '[aria-label="weather-day"]',
          url: cardsUrl,
        });
        const [$nameToday, ...$nameRemainingDays] = $forecastNames;

        expect($forecastNames).to.have.length(5);
        expect($nameToday.textContent).to.equal(results[0].snippet.extra.todayWeekday);

        [...$nameRemainingDays].forEach(($day, i) => {
          expect($day.textContent).to.equal(results[0].snippet.extra.forecast[i].weekday);
        });
      });

      it('renders with correct temperatures', async function () {
        const $forecastTemps = await getElements({
          elementSelector: '[aria-label="weather-temp"]',
          url: cardsUrl,
        });
        const [$tempToday, ...$tempRemainingDays] = $forecastTemps;

        expect($forecastTemps).to.have.length(5);
        expect($tempToday.textContent).to.contain('min.');
        expect($tempToday.textContent).to.contain('max.');
        expect($tempToday.textContent).to.contain(results[0].snippet.extra.todayMin);
        expect($tempToday.textContent).to.contain(results[0].snippet.extra.todayMax);

        [...$tempRemainingDays].forEach(($day, i) => {
          expect($day.textContent).to.contain('min.');
          expect($day.textContent).to.contain('max.');
          expect($day.textContent).to.contain(results[0].snippet.extra.forecast[i].min);
          expect($day.textContent).to.contain(results[0].snippet.extra.forecast[i].max);
        });
      });

      it('renders with correct icon', async function () {
        const $forecastIcons = await getElements({
          elementSelector: '[aria-label="weather-icon"]',
          url: cardsUrl,
        });
        const forecastIconStyle = await queryComputedStyle(cardsUrl, '[aria-label="weather-icon"] div div');
        const [iconStyleToday, ...iconStyleRemainingDays] = forecastIconStyle;

        expect($forecastIcons).to.have.length(5);
        expect(iconStyleToday.backgroundImage).to.contain(results[0].snippet.extra.todayIcon);

        expect(iconStyleRemainingDays.length).to.be.above(0);
        [...iconStyleRemainingDays].forEach((day, i) => {
          expect(day.backgroundImage).to.contain(results[0].snippet.extra.forecast[i].icon);
        });
      });
    });

    checkMoreOn({ url: cardsUrl, moreUrl: 'weatherunderground.com' });
    checkComplementarySearchCard({ url: cardsUrl });
  });
}
