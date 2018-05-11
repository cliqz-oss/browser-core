import CliqzEvents from '../core/events';
import config from '../core/config';
import prefs from '../core/prefs';

var CLIQZEnvironment = {
  RESULTS_PROVIDER: config.settings.RESULTS_PROVIDER,
  RICH_HEADER: config.settings.RICH_HEADER,
  RESULTS_LIMIT: config.settings.RESULTS_LIMIT,
  RESULTS_TIMEOUT: config.settings.RESULTS_TIMEOUT,
  getDefaultSearchEngine() {
    return prefs.get('engine', { name: 'google', url: 'https://www.google.com/search?q=' });
  },
  setDefaultSearchEngine(engine) {
    prefs.set('engine', engine);
  },
  historySearch() {},
  RERANKERS: [],
  //TODO: remove this dependency
  getSearchEngines: function(){
    return []
  },
  // mocked functions
  getEngineByName: function () {
    return '';
  },
  getEngineByAlias: function () {
    return '';
  },
  addEngineWithDetails: function() {

  },
  restoreHiddenSearchEngines: function() {

  },
  isUnknownTemplate: function() {},
  log: console.log,
  getWindow() {},
  isOnPrivateTab() { return false; },
  isPrivate() { return false; },
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  clearTimeout: clearInterval,
  Promise: Promise,
  telemetry: function() {},
};

export default CLIQZEnvironment;
