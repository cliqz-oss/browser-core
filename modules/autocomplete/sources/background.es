import utils from '../core/utils';
import { isFirefox } from '../core/platform';
import autocomplete from './autocomplete';
import historyCluster from './history-cluster';
import ResultProviders from './result-providers';
import CliqzSearchCountryProviders from './cliqz-backends';
import Result from './result';
import { background as AutocompleteBackground } from '../platform/auto-complete-component';
import background from '../core/base/background';
import Search from './search';
import ResultCache from './result-cache';

function onReady() {
  return new Promise((resolve) => {
    if (isFirefox && Services.search && Services.search.init) {
      Services.search.init(resolve);
    } else {
      resolve();
    }
  });
}

const _getSnippet = (url, data) => utils.fetchFactory()(url, { method: 'PUT', body: data })
  .then(r => r.json())
  .then((response) => {
    const oldResult = JSON.parse(data).results[0];
    const result = response.results.find(r => oldResult.url === r.url);
    const snippet = result.snippet;
    if (!snippet) {
      throw new Error('unknown');
    }
    if (snippet && snippet.friendlyUrl === 'n/a') {
      throw new Error('n/a');
    }
    return snippet;
  });

const getSnippetPromise = (url, data, retry = 0) => {
  if (retry === 0) {
    return Promise.reject();
  }

  return _getSnippet(url, data).catch((e) => {
    if (e.message === 'n/a') {
      return getSnippetPromise(url, data, retry - 1);
    }

    return Promise.reject();
  });
};

export default background({

  enabled() {
    return true;
  },

  init() {
    this.resultCache = new ResultCache();
    Search.fetchAndCacheResult = this.resultCache.getResult.bind(this.resultCache);
    Search.clearResultCache = this.resultCache.clear.bind(this.resultCache);
    this.autocomplete = autocomplete;
    this.autocomplete.setup();
    autocomplete.CliqzSearchCountryProviders = new CliqzSearchCountryProviders();
    return onReady().then(() => {
      autocomplete.CliqzResultProviders = new ResultProviders();
      AutocompleteBackground.init();

      autocomplete.CliqzHistoryCluster = historyCluster;

      // glueing stuff
      utils.autocomplete = autocomplete;
      utils.registerResultProvider({
        ResultProviders: autocomplete.CliqzResultProviders,
        Result,
      });
    });
  },

  unload() {
    AutocompleteBackground.unload();
  },

  beforeBrowserShutdown() {

  },

  actions: {
    search(query, cb) {
      const search = new Search();
      search.search(query, cb);
    },

    clearResultCache() {
      Search.clearResultCache();
    },

    /**
     * fetches extra info for result from rich header
     */
    getSnippet(query, result) {
      const loc = {
        latitude: utils.USER_LAT,
        longitude: utils.USER_LNG,
      };
      const url = utils.RICH_HEADER + utils.getRichHeaderQueryString(
        query,
        loc,
      );
      const resultData = {
        q: query,
        loc,
        results: [
          {
            url: result.url,
            snippet: {
              title: result.data.title,
              description: result.data.description,
            },
          }
        ],
      };

      return getSnippetPromise(url, JSON.stringify(resultData), 10);
    },
  },

  events: {
    'control-center:setDefault-search': function setDefaultSearchEngine(engine) {
      this.autocomplete.CliqzResultProviders.setCurrentSearchEngine(engine);
    },
    'control-center:setDefault-indexCountry': function setDefaultIndexCountry(country) {
      utils.setDefaultIndexCountry(country);
    },
    'core:urlbar_focus': function onUrlBarFocus() {
      if (isFirefox) {
        this.resultCache.clear();
      }
    },
    // there are a few places which can change some state and this state
    // must reset the whole result cache
    'core:reset_cache': function onResetCache() {
      if (isFirefox) {
        this.resultCache.clear();
      }
    },
  }
});
