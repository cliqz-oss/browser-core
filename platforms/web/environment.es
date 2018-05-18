/* eslint no-param-reassign: 'off' */
/* global window */
/* global CLIQZ */
/* global Search */

import console from '../core/console';
import prefs from '../core/prefs';
import Storage from '../core/storage';
import osAPI from './os-api';

// TODO: get rid of me!
const storage = new Storage();

// END TEMP
const TEMPLATES = Object.freeze(Object.assign(Object.create(null), {
  Cliqz: true,
  'EZ-history': true,
  calculator: true,
  currency: true,
  emphasis: true,
  empty: true,
  flight: true,
  generic: true,
  history: true,
  main: true,
  noResult: true,
  'rd-h3-w-rating': true,
  results: true,
  topnews: true,
  topsites: true,
  weatherAlert: true,
  weatherEZ: true,
}));

const CLIQZEnvironment = {
  TEMPLATES_PATH: 'mobile-ui/templates/',
  RERANKERS: [],
  RESULTS_TIMEOUT: 60000, // 1 minute
  TEMPLATES,
  KNOWN_TEMPLATES: {
    'entity-generic': true,
    'entity-video-1': true,
    vod: true,
    'movie-vod': true,
    lotto: true,
  },
  PARTIALS: [
    'url',
    'logo',
    'EZ-category',
    'rd-h3-w-rating',
  ],
  defaultSearchEngine: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    default: true,
    getSubmissionForQuery: query => CLIQZEnvironment.defaultSearchEngine.url + query,
  },
  // TODO: check if calling the bridge for each telemetry point is expensive or not
  telemetry(msg) {
    msg.ts = Date.now();
    osAPI.pushTelemetry(msg);
  },
  isUnknownTemplate(template) {
    // in case an unknown template is required
    return template &&
      !CLIQZEnvironment.TEMPLATES[template] &&
      !Object.prototype.hasOwnProperty.call(CLIQZEnvironment.KNOWN_TEMPLATES, template);
  },
  resultsHandler(r) {
    if (CLIQZEnvironment.lastSearch !== r._searchString) {
      console.log(`u='${CLIQZEnvironment.lastSearch}' s='${r._searchString}', returning`, 'urlbar!=search');
      return;
    }

    r._results.splice(3);

    window.CLIQZ.UI.renderResults(r);
  },
  search(e) {
    if (!e || e === '') {
      CLIQZEnvironment.lastSearch = '';
      CLIQZ.UI.stopProgressBar();
      CLIQZ.UI.lastResults = null;
      return;
    }

    e = decodeURIComponent(e);

    CLIQZEnvironment.setCurrentQuery(e);

    CLIQZEnvironment.lastSearch = e;

    window.CLIQZ.UI.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // CliqzUtils.log(e,'XHR');
    if (!CLIQZEnvironment.SEARCH) { CLIQZEnvironment.SEARCH = new Search(); }

    CLIQZEnvironment.SEARCH.search(e, CLIQZEnvironment.resultsHandler);
  },
  setInterval(...args) { return setInterval(...args); },
  setTimeout(...args) { return setTimeout(...args); },
  clearTimeout(...args) { clearTimeout(...args); },
  Promise,
  OS: 'mobile',
  isPrivate() { return false; },
  isOnPrivateTab() { return false; },
  getWindow() { return window; },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  openLink(window, url) {
    if (url !== '#') {
      if (url.indexOf('http') === -1) {
        url = `http://${url}`;
      }
      osAPI.openLink(url);
    }

    return false;
  },
  // TODO: remove this dependency
  getSearchEngines() {
    return [CLIQZEnvironment.defaultSearchEngine];
  },
  // mocked functions
  getEngineByName() {
    return '';
  },
  getEngineByAlias() {
    return '';
  },
  copyResult(val) {
    osAPI.copyResult(val);
  },
  setDefaultSearchEngine({ name, url }) {
    CLIQZEnvironment.defaultSearchEngine.name = name;
    CLIQZEnvironment.defaultSearchEngine.url = url;
  },
  getDefaultSearchEngine() {
    return CLIQZEnvironment.defaultSearchEngine;
  },
  addEngineWithDetails() {
  },
  restoreHiddenSearchEngines() {
  },
  removeEngine() {
  },
};

CLIQZEnvironment.setCurrentQuery = (query) => {
  if (prefs.get('incognito', false) || query.match(/http[s]{0,1}:/)) {
    return;
  }

  let recentItems = storage.getObject('recentQueries', []);

  if (!recentItems[0]) {
    recentItems = [{ id: 1, query, timestamp: Date.now() }];
    storage.setObject('recentQueries', recentItems);
  } else if (
    recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60
  ) {
    // DO NOTHING
    // temporary work around repetitive queries coming from iOS
  } else if (recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 &&
    Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = { id: recentItems[0].id, query, timestamp: Date.now() };
    storage.setObject('recentQueries', recentItems);
  } else {
    recentItems.unshift({ id: recentItems[0].id + 1, query, timestamp: Date.now() });
    recentItems = recentItems.slice(0, 60);
    storage.setObject('recentQueries', recentItems);
  }
};

export default CLIQZEnvironment;
