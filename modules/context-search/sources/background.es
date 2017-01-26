import { utils } from 'core/cliqz';
import background from 'core/base/background';
import ContextSearch from 'context-search/context-search';

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
      return new Promise((resolve) => {
        utils.getBackendResults(qExt).then(resolve);
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
    utils.bindObjectFunctions(this.actions, this);

    utils.RERANKERS.push(this.reranker);
  },

  /**
   * @method unload
   */
  unload() {
    this.contextSearch.unload();
    const index = utils.RERANKERS.indexOf(this.reranker);
    if (index !== -1) {
      utils.RERANKERS.splice(index, 1);
    }
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
