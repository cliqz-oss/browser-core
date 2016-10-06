/*
 * This module implements the fetching of suggestions from the default search engine of the user
 * It returns the suggestions formated as Cliqz results so that they can be display on the dropdown 
 * with no code changes
 */
import { utils } from "core/cliqz";
import CLIQZEnvironment from "platform/environment";

'use strict';

var ExpansionsProvider = {
  enabled: null,
  init: function () {
    if (ExpansionsProvider.isEnabled()) {
      utils.getBackendResults = ExpansionsProvider.getResults;
    }
  },
  isEnabled: function () {
    if (ExpansionsProvider.enabled === null) {
      ExpansionsProvider.enabled = utils.getPref('expansion_fallback', false);
    }
    return ExpansionsProvider.enabled;
  },
  enable: function () {
    ExpansionsProvider.enabled = true;
    utils.setPref('expansion_fallback', true);
    utils.setPref('ignored_location_warning', true);
    utils.getBackendResults = ExpansionsProvider.getResults;
  },
  disable: function () {
    ExpansionsProvider.enabled = false;
    utils.setPref('expansion_fallback', false);
    utils.setPref('ignored_location_warning', false);
    utils.getBackendResults = utils.getCliqzResults;
  },
  getResults: function (q, callback) {
    // TODO: propably there are more parameters we need to provide here, 
    //     i.e. google opensearch search Url description
    var fullUrl = CLIQZEnvironment.getDefaultSearchEngine().getSuggestionUrlForQuery(q);
    var req = utils.httpGet(fullUrl, function (res) {
      var suggestionResults = ExpansionsProvider.formatResults(res.response, q);
      // The first arg is faking a request response from Cliqz so that 
      // we can re-use the same function in autocomplete to display the results
      callback && callback( {'response': JSON.stringify({'result': suggestionResults})}, q);
    });
  },
  formatResults: function (text, q) {
    var results = JSON.parse(text);
    return results[1].map(function(expansion) {
            return {'snippet': {'title': expansion, 'desc': ''},
                    'url': CLIQZEnvironment.getDefaultSearchEngine().getSubmissionForQuery(expansion),
                    'source': 'expansions',
                    'q': q
                    };
          });
  }
};

export default ExpansionsProvider;