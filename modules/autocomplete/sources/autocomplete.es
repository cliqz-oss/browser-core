/*
 * This module implements the core functionality based on nsIAutoCompleteResult interface
 * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
 */

import { utils, events } from "core/cliqz";
import historyCluster from "autocomplete/history-cluster";
import Result from "autocomplete/result";
import resultProviders from "autocomplete/result-providers";
import language from "platform/language";

var CliqzAutocomplete = {
    LOG_KEY: 'CliqzAutocomplete',
    HISTORY_TIMEOUT: 200,
    SCROLL_SIGNAL_MIN_TIME: 500,
    REFETCH_MAX_ATTEMPTS: 10, // How many times should we try fetching incomplete (promised) results before giving up?
    lastPattern: null,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
    lastResultHeights: [],
    hasUserScrolledCurrentResults: false, // set to true whenever user scrolls, set to false when new results are shown
    lastResultsUpdateTime: null, // to measure how long a result has been shown for
    resultsOverflowHeight: 0, // to determine if scrolling is possible (i.e., overflow > 0px)
    afterQueryCount: 0,
    discardedResults: 0,
    isPopupOpen: false,
    lastPopupOpen: null,
    lastQueryTime: null,
    lastDisplayTime: null,
    lastFocusTime: null,
    highlightFirstElement: false,
    hm: null,
    currentAutoLoadURL: null,
    getResultsOrder: function(results){
        return CliqzAutocomplete.prepareResultOrder(results);
    },
    // SOURCE: https://dxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl

    // a result is done once a new result comes in, or once the popup closes
    markResultsDone: function(newResultsUpdateTime) {
        // is there a result to be marked as done?
        if (CliqzAutocomplete.lastResultsUpdateTime) {
            var resultsDisplayTime = Date.now() - CliqzAutocomplete.lastResultsUpdateTime;
            this.sendResultsDoneSignal(resultsDisplayTime);
        }
        // start counting elapsed time anew
        CliqzAutocomplete.lastResultsUpdateTime = newResultsUpdateTime;
        CliqzAutocomplete.hasUserScrolledCurrentResults = false;
    },
    sendResultsDoneSignal: function(resultsDisplayTime) {
        // reduced traffic: only consider telemetry data if result was shown long enough (e.g., 0.5s)
        if (resultsDisplayTime > CliqzAutocomplete.SCROLL_SIGNAL_MIN_TIME) {
            var action = {
                type: 'activity',
                action: 'results_done',
                has_user_scrolled: CliqzAutocomplete.hasUserScrolledCurrentResults,
                results_display_time: resultsDisplayTime,
                results_overflow_height: CliqzAutocomplete.resultsOverflowHeight,
                can_user_scroll: CliqzAutocomplete.resultsOverflowHeight > 0
            };
            utils.telemetry(action);
        }
    },
    // returns array of result kinds, adding each result's
    // height in terms of occupied dropdown slots (1-3) as
    // parameter (e.g., ["C|{\"h\":1}"],["m|{\"h\":1}"])
    prepareResultOrder: function (results) {
        // heights is updated in UI's handleResults
        var heights = CliqzAutocomplete.lastResultHeights,
            resultOrder = [];

        if (results) {
            for(var i = 0; i < results.length; i++) {
                if(results[i].data == null || results[i].data.kind == null){
                  resultOrder.push('_'); //debug - it should not happen
                  continue;
                }

                var kind   = results[i].data.kind.slice(0),
                    tokens = kind && kind.length > 0 ?
                             kind[0].split('|') : [],
                    params = tokens.length > 1 ?
                             JSON.parse(tokens[1]) : {};

                params.h = i < heights.length ?
                           heights[i] : 0;
                kind[0] =
                    tokens[0] + '|' + JSON.stringify(params);
                resultOrder.push(kind);
            }
        }

        return resultOrder;
    },
};

export default CliqzAutocomplete;
