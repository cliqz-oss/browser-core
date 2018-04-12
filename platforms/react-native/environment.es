import config from '../core/config';

const defaultSearchEngine = {
  name: 'google',
  url: 'https://www.google.com/search?q=',
  default: true,
  getSubmissionForQuery: query => defaultSearchEngine.url + query,
};

var CLIQZEnvironment = {
  RESULTS_TIMEOUT: config.settings.RESULTS_TIMEOUT,
  getDefaultSearchEngine() {
    return defaultSearchEngine;
  },
  setDefaultSearchEngine({ name, url }) {
    defaultSearchEngine.name = name;
    defaultSearchEngine.url = url;
  },
  historySearch() {},
  RERANKERS: [],
  //TODO: remove this dependency
  getSearchEngines: function(){
    return [defaultSearchEngine];
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
