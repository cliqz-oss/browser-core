/*
 * This module implements the fetching of suggestions from the default search engine of the user
 * It returns the suggestions formated as Cliqz results so that they can be display on the dropdown
 * with no code changes
 */
import { utils } from "core/cliqz";
import CLIQZEnvironment from "platform/environment";

'use strict';

class ExpansionsProviderReranker {
  constructor() {
    this.name = 'expansions-provider-reranker';
  }

  formatResults(text, q) {
    var results = JSON.parse(text);
    return results[1].map(function(expansion) {
            return {'snippet': {'title': expansion, 'desc': ''},
                    'url': CLIQZEnvironment.getDefaultSearchEngine().getSubmissionForQuery(expansion),
                    'source': 'expansions',
                    'q': q
                    };
          });
  }

  duringResults(res) {
    // TODO: propably there are more parameters we need to provide here,
    //     i.e. google opensearch search Url description
    return new Promise((resolve, reject) => {
      var fullUrl = CLIQZEnvironment.getDefaultSearchEngine().getSuggestionUrlForQuery(res.query);
      var req = utils.httpGet(fullUrl, function (res) {
        var suggestionResults = this.formatResults(res.response, q);
        // The first arg is faking a request response from Cliqz so that
        // we can re-use the same function in autocomplete to display the results
        resolve && resolve({query: res.query, response: {results: suggestionResults}});
      });
    });
  }

  afterResults(myResults, backendResults) {
    return Promise.resolve(myResults);
  }
}


export default class ExpansionsProvider {
  constructor() {
    this.reranker = new ExpansionsProviderReranker();
  }

  isEnabled() {
    return utils.RERANKERS.indexOf(this.reranker) > -1;
  }

  enable() {
    if (!this.isEnabled()) {
      utils.setPref('expansion_fallback', true);
      utils.RERANKERS.push(this.reranker);
    }

  }

  disable() {
    if (this.isEnabled()) {
      utils.setPref('expansion_fallback', false);
      utils.RERANKERS.splice(utils.RERANKERS.indexOf(this.reranker), 1);
    }
  }

};
