/* global Handlebars */
import Calculator from './fixtures/calculator';
import Company from './fixtures/company';
import DialingCode from './fixtures/dialing-code';
import Flight from './fixtures/flight';
import Lotto from './fixtures/lotto';
import MovieCinema from './fixtures/movie-cinema';
import News from './fixtures/news';
import Offers from './fixtures/offers';
import SimpleResult from './fixtures/simple';
import Soccer from './fixtures/soccer';
import Time from './fixtures/time';
import Youtube from './fixtures/youtube';
import Weather from './fixtures/weather';

import templates from '../templates';
import helpers from '../helpers';

import Dropdown from '../dropdown';
import Results from '../results';
import config from '../../core/config';

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

const tests = {
  ...Calculator,
  ...Company,
  ...DialingCode,
  ...Flight,
  ...Lotto,
  ...MovieCinema,
  ...News,
  ...Offers,
  ...SimpleResult,
  ...Soccer,
  ...Time,
  ...Youtube,
  ...Weather,
};

const stylesheet = document.createElement('link');
stylesheet.setAttribute('rel', 'stylesheet');
stylesheet.setAttribute('href', `./styles/styles.css?r=${Date.now()}`);
document.head.appendChild(stylesheet);


function render(id, query, rawResults) {
  const box = document.createElement('div');
  const hr = document.createElement('hr');
  const h2 = document.createElement('h2');
  const snippet = document.createElement('pre');
  h2.innerText = `Test: ${id} -- Query: ${query}`;
  snippet.innerText = JSON.stringify(rawResults, null, 2);
  document.body.appendChild(h2);
  document.body.appendChild(box);
  document.body.appendChild(hr);

  const actions = new Proxy({}, {
    get() {
      return () => {};
    },
  });
  const dropdown = new Dropdown(box, window, actions);
  dropdown.init();
  // Add default padding for results in debug page
  dropdown.dropdownElement.style.setProperty('--content-padding-start', '50px');
  const queryCliqz = () => {};
  const results = new Results({
    query,
    rawResults,
    queryCliqz,
  }, {
    assistants: {
      adult: {},
      offers: {},
      location: {},
      settings: config.settings,
    },
    actions: {
    },
  });

  dropdown.renderResults(results);
}

const query = window.location.search.substring(1);
const grepValue = query.match(/grep=([^&]*)/);
const testsToRun = grepValue ? decodeURIComponent(grepValue[1]) : 'all';

Object.keys(tests).forEach((testName) => {
  if (testsToRun !== 'all' && !testName.includes(testsToRun)) {
    return;
  }

  const test = tests[testName];
  render(testName, test.query, test.results);
});
