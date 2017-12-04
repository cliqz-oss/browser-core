import Handlebars from 'handlebars';
import SimpleResult from './fixtures/simple';
import HistoryAndNews from './fixtures/history-and-news';
import Weather from './fixtures/weather';
import Youtube from './fixtures/youtube';
import Calculator from './fixtures/calculator';
import Celebrities from './fixtures/celebrities';
import AdultQuestion from './fixtures/adult-question';
import LocationSharing from './fixtures/location-sharing';
import UiCutOff from './fixtures/ui-cut-off';
import Lotto from './fixtures/lotto';
import Offers from './fixtures/offers';
import Soccer from './fixtures/soccer';
import Suggestions from './fixtures/suggestions';
import Time from './fixtures/time';
import Flight from './fixtures/flight';
import MovieCinema from './fixtures/movie-cinema';
import NewsStory from './fixtures/news-story';
import templates from '../templates';
import helpers from '../helpers';

import Dropdown from '../dropdown';
import Results from '../results';
import AdultAssistant from '../adult-content-assistant';
import LocationAssistant from '../location-sharing-assistant';
import NavigateToResult from '../results/navigate-to';
import SupplementarySearchResult from '../results/supplementary-search';

Handlebars.partials = templates;
Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

const tests = {
  ...SimpleResult,
  ...HistoryAndNews,
  ...Weather,
  ...Youtube,
  ...Calculator,
  ...Celebrities,
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
};

const stylesheet = document.createElement('link');
stylesheet.setAttribute('rel', 'stylesheet');
stylesheet.setAttribute('href', 'chrome://cliqz/content/dropdown/styles/styles.css?r='+Date.now())
document.head.appendChild(stylesheet);


function render(id, query, rawResults) {
  const box = document.createElement('div');
  const hr = document.createElement('hr');
  const h2 = document.createElement('h2');
  const snippet = document.createElement('pre');
  h2.innerText = 'Test: '+ id + ' -- Query: ' + query;
  snippet.innerText = JSON.stringify(rawResults, null, 2)
  document.body.appendChild(h2)
  //document.body.appendChild(snippet)
  document.body.appendChild(box);
  document.body.appendChild(hr)

  const dropdown = new Dropdown(box, window, 'cliqz@cliqz.com');
  dropdown.init();
  const sessionCountPromise = new Promise(resolve => {
    setTimeout(() => {
      const count = Math.floor(Math.random() * 10000) % 2000;
      resolve(count);
    }, 3000);
  });
  const queryCliqz = function () {};
  let adultAssistant = new AdultAssistant();
  let locationAssistant = new LocationAssistant({});
  const results = new Results({ query, rawResults, sessionCountPromise, queryCliqz, adultAssistant, locationAssistant });
  if(query == 'query'){
    results.prepend(
      new SupplementarySearchResult({ text: query, data: { suggestion : query + " suggestion 1" }})
    );
  } else {
    results.prepend(
      new NavigateToResult({ text: 'https://cliqz.com' })
    );
  }
  dropdown.renderResults(results);
}

Object.keys(tests).forEach((testName) => {
  const test = tests[testName];
  render(testName, test.query, test.results);
});
