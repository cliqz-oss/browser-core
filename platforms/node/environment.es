import config from '../core/config';
import console from './console';

const CLIQZEnvironment = {
  RESULTS_TIMEOUT: config.settings.RESULTS_TIMEOUT,
  getDefaultSearchEngine() {
    return { name: 'google', url: 'http://www.google.com/search?q=' };
  },
  restoreHiddenSearchEngines() {},
  historySearch() {},
  RERANKERS: [],
  // TODO: remove this dependency
  getSearchEngines: () => [],
  // mocked functions
  getEngineByName: () => '',
  getEngineByAlias: () => '',
  isUnknownTemplate: () => {},
  log: console.log,
  getWindow() {},
  setTimeout,
  setInterval,
  clearInterval,
  clearTimeout: clearInterval,
  Promise,
  telemetry: () => {},
};

export default CLIQZEnvironment;
