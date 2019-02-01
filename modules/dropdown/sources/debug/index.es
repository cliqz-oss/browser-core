/* global Handlebars */
import SimpleResult from './fixtures/simple';
import HistoryAndNews from './fixtures/history-and-news';
import NewsInHistory from './fixtures/news-in-history';
import YoutubeInHistory from './fixtures/youtube-in-history';
import Weather from './fixtures/weather';
import DialingCode from './fixtures/dialing-code';
import Youtube from './fixtures/youtube';
import Calculator from './fixtures/calculator';
import AdultQuestion from './fixtures/adult-question';
import LocationSharing from './fixtures/location-sharing';
import UiCutOff from './fixtures/ui-cut-off';
import Lotto from './fixtures/lotto';
import Offers from './fixtures/offers';
import OffersResult from './fixtures/offer';
import Soccer from './fixtures/soccer';
import Suggestions from './fixtures/suggestions';
import Time from './fixtures/time';
import Flight from './fixtures/flight';
import MovieCinema from './fixtures/movie-cinema';
import NewsStory from './fixtures/news-story';
import TopNews from './fixtures/top-news';
import templates from '../templates';
import helpers from '../helpers';

import Dropdown from '../dropdown';
import Results from '../results';
import NavigateToResult from '../results/navigate-to';
import SupplementarySearchResult from '../results/supplementary-search';
import config from '../../core/config';

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

const tests = {
  ...SimpleResult,
  ...HistoryAndNews,
  ...NewsInHistory,
  ...YoutubeInHistory,
  ...Weather,
  ...DialingCode,
  ...Youtube,
  ...Calculator,
  ...AdultQuestion,
  ...LocationSharing,
  ...UiCutOff,
  ...Lotto,
  ...Offers,
  ...Soccer,
  ...Suggestions,
  ...Time,
  ...Flight,
  ...MovieCinema,
  ...NewsStory,
  ...TopNews,
  ...OffersResult,
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

  if (query === 'query') {
    results.prepend(
      new SupplementarySearchResult({ text: query, meta: {}, data: { extra: {}, suggestion: `${query} suggestion 1` } })
    );
  } else {
    results.prepend(
      new NavigateToResult({ text: 'https://cliqz.com', meta: {}, data: { extra: {} } })
    );
  }
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
