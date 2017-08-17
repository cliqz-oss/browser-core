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
};
Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
const System = CLIQZ.System;
const Dropdown = System.get('dropdown/dropdown').default;
const Results = System.get('dropdown/results').default;
const AdultAssistant = System.get('dropdown/adult-content-assistant').default;
const LocationAssistant = System.get('dropdown/location-sharing-assistant').default;
const NavigateToResult = System.get('dropdown/results/navigate-to').default;
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

  const dropdown = new Dropdown(box)
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
  results.prepend(
    new NavigateToResult({ text: 'https://cliqz.com' })
  );
  dropdown.renderResults(results);
}

Object.keys(tests).forEach((testName) => {
  const test = tests[testName];
  render(testName, test.query, test.results);
});
