/* eslint func-names: 'off' */

import background from '../core/base/background';
import ContextSearch from './context-search';

/**
 * @namespace context-search
 * @class Background
 */

class ContextSearchReranker {
  constructor(contextSearch) {
    this.contextSearch = contextSearch;
    this.name = this.contextSearch.name;
  }

  duringResults(input) {
    const qExt = this.contextSearch.getQExt(input.query, false);
    if (qExt && qExt.trim() !== input.query.trim()) {
      return new Promise(() => {
        // TODO - fix
        // utils.getBackendResults(qExt).then(resolve);
      });
    }
    return Promise.resolve(input);
  }

  afterResults(myResults, originalResults) {
    return new Promise((resolve) => {
      const results = [originalResults];
      if (myResults.response) {
        results.push(myResults);
      }
      const newResponse = this.contextSearch.doRerank(results, originalResults.query);

      const response = Object.assign({}, originalResults.response, {
        results: newResponse.response,
        telemetrySignal: newResponse.telemetrySignal,
      });

      resolve(Object.assign({}, originalResults, {
        response,
      }));
    });
  }
}

export default background({

  /**
   * @method init
   */
  init() {
    this.contextSearch = new ContextSearch();
    this.contextSearch.init();

    this.reranker = new ContextSearchReranker(this.contextSearch);
  },

  /**
   * @method unload
   */
  unload() {
    this.contextSearch.unload();
  },

  actions: {
    expandQuery(query, ignoreCache = false) {
      return this.contextSearch.getQExt(query, ignoreCache);
    },
    mergeResults(expanded, original) {
      return ContextSearch.mergeResults(original, expanded);
    },
  },

  events: {
    /**
     * @event ui:click-on-url
     */
    'ui:click-on-url': function () {
      this.contextSearch.invalidCache = true;
    },
    alternative_search() {
      this.contextSearch.invalidCache = true;
    },
    'core:url-meta': function (url, meta) {
      this.contextSearch.addNewUrlToCache(decodeURI(url), meta);
      this.contextSearch.testUrlDistribution(decodeURI(url));
    },

  },
});
