/*
 * This module implements the core functionality based on nsIAutoCompleteResult interface
 * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
 */

import { utils, events } from "core/cliqz";
import historyCluster from "autocomplete/history-cluster";
import Result from "autocomplete/result";
import resultProviders from "autocomplete/result-providers";

function isQinvalid(q){
    //TODO: add more
    if(q.indexOf('view-source:') === 0) return true;

    return false;
}

var CliqzAutocomplete = {
    LOG_KEY: 'CliqzAutocomplete',
    HISTORY_TIMEOUT: 200,
    SCROLL_SIGNAL_MIN_TIME: 500,
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
    spellCorrectionDict: {},
    spellCorr: {
        'on': false,
        'correctBack': {},
        'override': false,
        'pushed': null,
        'userConfirmed': false,
        'searchTerms': []
    },
    hm: null,
    currentAutoLoadURL: null,
    getResultsOrder: function(results){
        return CliqzAutocomplete.prepareResultOrder(results);
    },
    // SOURCE: https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component
    ProviderAutoCompleteResultCliqz: function(searchString, searchResult,
        defaultIndex, errorDescription) {
        this._searchString = searchString;
        this._searchResult = searchResult;
        this._defaultIndex = defaultIndex;
    },
    // SOURCE: http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
    CliqzResults: function(){},
    resetSpellCorr: function() {
        CliqzAutocomplete.spellCorr = {
            'on': false,
            'correctBack': {},
            'override': false,
            'pushed': null,
            'userConfirmed': false,
            'searchTerms': []
        }
    },
    initProvider: function(){
        CliqzAutocomplete.ProviderAutoCompleteResultCliqz.prototype = {
            _searchString: '',
            _searchResult: 0,
            _defaultIndex: 0,
            _errorDescription: '',
            _results: [],

            get searchString() { return this._searchString; },
            get searchResult() { return this._searchResult; },
            get defaultIndex() { return this._defaultIndex; },
            get errorDescription() { return this._errorDescription; },
            get matchCount() { return this._results.length; },
            getValueAt: function(index) { return (this._results[index] || {}).val; },
            getFinalCompleteValueAt: function(index) { return null; }, //FF31+
            getCommentAt: function(index) { return (this._results[index] || {}).comment; },
            getStyleAt: function(index) { return (this._results[index] || {}).style; },
            getImageAt: function (index) { return ''; },
            getLabelAt: function(index) { return (this._results[index] || {}).label; },
            getDataAt: function(index) { return (this._results[index] || {}).data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            setResults: function(results){

                this._results = this.filterUnexpected(results);

                CliqzAutocomplete.lastResult = this;
                events.pub('autocomplete.new_result', { result: this, isPopupOpen: CliqzAutocomplete.isPopupOpen });
                var order = CliqzAutocomplete.getResultsOrder(this._results);
                utils.setResultOrder(order);

                // flag for rendering to avoid rendering of "unmixed" results
                this.isMixed = true;
            },

            filterUnexpected: function(results){
                // filter out ununsed/unexpected results
                var ret=[];
                for(var i=0; i < results.length; i++){
                    var r = results[i];
                    if(r.style == 'cliqz-extra'){
                        if(r.data){
                            // override the template if the superTemplate is known
                            if(utils.isUnknownTemplate(r.data.template)){
                                // unexpected/unknown template
                                continue;
                            }
                        }
                    }

                    // If one of the results is data.only = true Remove all others.
                    // if (!r.invalid && r.data && r.data.only) {
                    //  return [r];
                    //}

                    ret.push(r);
                }
                return ret;
            }
        }
    },
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
    initResults: function(){
        CliqzAutocomplete.CliqzResults.prototype = {
            resultsTimer: null,
            historyTimer: null,
            historyTimeout: false,
            instant: [],

            historyTimeoutCallback: function(params) {
                utils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                this.historyTimeout = true;
                // History timed out but maybe we have some results already
                // So show what you have - AB 1073
                if (this.historyResults && CliqzUtils.getPref("history.timeouts", false)) {
                    historyCluster.addFirefoxHistory(this.historyResults);
                    CliqzUtils.log('historyTimeoutCallback: push collected results:' + this.historyResults.results.length, CliqzAutocomplete.LOG_KEY);
                } else {
                    this.pushResults(this.searchString);
                }
            },
            onHistoryDone: function(result, resultExtra) {
                if(!this.startTime) {
                    return; // no current search, just discard
                }

                var now = Date.now();

                this.historyResults = result;
                this.latency.history = now - this.startTime;

                //utils.log("history results: " + (result ? result.matchCount : "null") + "; done: " + this.isHistoryReady() +
                //               "; time: " + (now - this.startTime), CliqzAutocomplete.LOG_KEY)
                // Choose an instant result if we have all history results (timeout)
                // and we haven't already chosen one
                if(result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                    utils.clearTimeout(this.historyTimer);
                    historyCluster.addFirefoxHistory(result);
                }
            },
            isHistoryReady: function() {
                return this.historyResults && this.historyResults.ready;
            },
            cliqz_hm_search: function(_this, res, hist_search_type) {
                var data = null;
                if (hist_search_type === 1) {
                  data = CliqzUtils.hm.do_search(res.query, false);
                  data['cont'] = null;
                }
                else {
                  data = CliqzUtils.hm.do_search(res.query, true);
                }

                var urlAuto = CliqzUtils.hm.urlForAutoLoad(data);
                if (false && urlAuto) {
                    var win = CliqzUtils.getWindow().gBrowser.contentWindow;
                    //if (CliqzAutocomplete.currentAutoLoadURL==null || win.location.href=='about:cliqz') {
                        if (win.location.href!=urlAuto) {
                            CliqzUtils.log(">> AUTOLOAD LAUNCH: " + urlAuto, 'CliqzHM');
                            win.location.href = urlAuto;
                            CliqzAutocomplete.currentAutoLoadURL = urlAuto;
                        }
                    //}
                }

                // Extract results
                var patterns = [];
                for (var i = 0; i < data.result.length; i++) {
                  var url = CliqzUtils.cleanMozillaActions(data.result[i][0])[1],
                      title = data.result[i][1];

                  if (!title || title == 'N/A') {
                    title = CliqzUtils.generalizeUrl(url);
                  }

                  if (title.length > 0 && url.length > 0 &&
                      Result.isValid(url, CliqzUtils.getDetailsFromUrl(url))) {

                    var item = {
                      url: url,
                      title: title,
                      favicon: null, //history.results[i].image,
                      _genUrl: CliqzUtils.generalizeUrl(url, true),
                    };

                    if (data.result[i][3]) {
                        if (data.result[i][3].hasOwnProperty('c')) item['xtra_c'] = data.result[i][3]['c'];
                        if (data.result[i][3].hasOwnProperty('q')) item['xtra_q'] = data.result[i][3]['q'];
                    }

                    patterns.push(item);
                  }

                  var cont = null;
                  if (data.hasOwnProperty('cont')) cont = data['cont'];

                }

                if(patterns.length >0){
                    var res3 = historyCluster._simplePreparePatterns(patterns, res.query);
                    // This is also causing undefined issue. Specifically when the res.length == 0;
                    if(res3.results.length == 0){
                        res3.results.push({"url": res.query,"title": "Found no result in local history for query: ","favicon": "","_genUrl": "","base": true,"debug": ""})
                    }
                    historyCluster.simpleCreateInstantResult(res3, cont,  _this.searchString, function(kk2) {
                        var vjoin = [];
                        vjoin.push(kk2[0]);
                        _this.createInstantResultCallback(vjoin, 'hm');
                    });
                }


            },
            historyPatternCallback: function(res) {

                // abort if we already have results
                if(this.mixedResults.matchCount > 0) return;

                if (res.query == this.searchString) {
                    CliqzAutocomplete.lastPattern = res;

                    var latency = 0;
                    if (historyCluster.latencies[res.query]) {
                        latency = (new Date()).getTime() - historyCluster.latencies[res.query];
                    }
                    this.latency.patterns = latency;

                    // Create instant result
                    historyCluster.createInstantResult(res, this.searchString, this.createInstantResultCallback, this.customResults);
                }
            },
            createInstantResultCallback:function(instant, type_res) {
                if (type_res == 'hm') {
                  instant[0].type = 'hm'
                  this.instant.unshift(instant[0]);
                } else {
                  if(this.instant.length > 0 && this.instant[0].type == 'hm'){
                    this.instant[1] = instant[0];
                  } else {
                    this.instant = instant
                  }
                }
                this.pushResults(this.searchString);
            },
            pushTimeoutCallback: function(params) {
                utils.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
                this.pushResults(params);
            },
            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
                    var now = Date.now();

                    if((now > this.startTime + utils.RESULTS_TIMEOUT) ||
                       (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out
                       this.cliqzResults) { // all results are ready
                        /// Push full result
                        utils.clearTimeout(this.resultsTimer);
                        utils.clearTimeout(this.historyTimer);

                        this.mixResults(false);

                        this.latency.mixed = Date.now() - this.startTime;

                        this.callback(this.mixedResults, this);

                        this.latency.all = Date.now() - this.startTime;

                        // delay wrapping to make sure rendering is complete
                        // otherwise we don't get up to date autocomplete stats
                        utils.setTimeout(this.fullWrapup, 0, this);

                        return;
                    } else if(this.isHistoryReady()) {
                        /// Push instant result
                        this.latency.mixed = Date.now() - this.startTime;

                        this.mixResults(true);

                        // try to update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.callback(this.mixedResults, this);

                        this.latency.all = Date.now() - this.startTime;

                        // Do partial wrapup, final wrapup will happen after all results are received
                        utils.setTimeout(this.instantWrapup, 0, this);
                    } else {
                        /// Nothing to push yet, probably only cliqz results are received, keep waiting
                    }
                }
            },

            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {

                // be sure this is not a delayed result
                if(q != this.searchString) {
                    this.discardedResults += 1; // count results discarded from backend because they were out of date
                } else {
                    this.latency.backend = Date.now() - this.startTime;
                    var results = [];
                    var json = JSON.parse(req.response);

                    // apply rerankers
                    for (var i = 0; i < utils.RERANKERS.length; i++){
                        var reranker = utils.RERANKERS[i];
                        if (reranker != null){
                            var rerankerResults = reranker.doRerank(json.result);
                            json.result = rerankerResults.response;
                            if (Object.keys(rerankerResults.telemetrySignal).length > 0){
                                this.userRerankers[reranker.name] = rerankerResults.telemetrySignal;
                            }
                        }

                    }

                    utils.log(json.result ? json.result.length : 0,"CliqzAutocomplete.cliqzResultFetcher");

                    results = json.result || [];

                    this.cliqzResultsExtra = [];

                    if(json.images && json.images.results && json.images.results.length >0){
                        var imgs = json.images.results.filter(function(r){
                            //ignore empty results
                            return Object.keys(r).length != 0;
                        });

                        this.cliqzResultsExtra =imgs.map(Result.cliqzExtra);
                    }

                    var hasExtra = function(el){
                        if(!el || !el.results || el.results.length == 0) return false;
                        el.results = el.results.filter(function(r){
                            //ignore empty results
                            return r.hasOwnProperty('url');
                        });

                        return el.results.length != 0;
                    };

                    if(hasExtra(json.extra)) {
                        this.cliqzResultsExtra = json.extra.results.map(Result.cliqzExtra);
                    }
                    this.latency.cliqz = json.duration;

                    this.cliqzResults = results.filter(function(r){
                        // filter results with no or empty url
                        return r.url != undefined && r.url != '';
                    });

                    this.cliqzResultsParams = {
                      choice: json.choice,
                    };
                }
                this.pushResults(q);
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            // mixes backend results, entity zones, history and custom results
            mixResults: function(only_instant) {

                // set first history entry as autocompleted if it was
                if(this.instant.length > 0 &&
                   CliqzAutocomplete.lastAutocompleteActive && !only_instant) {
                  this.instant[0].autocompleted = true;
                }

                var results = CliqzAutocomplete.Mixer.mix(
                            this.searchString,
                            this.cliqzResults,
                            this.cliqzResultsExtra,
                            this.instant,
                            this.customResults,
                            only_instant
                    );
                CliqzAutocomplete.lastResultIsInstant = only_instant;
                CliqzAutocomplete.afterQueryCount = 0;

                this.mixedResults.setResults(results);
            },
            analyzeQuery: function(q){
                var parts = resultProviders.getCustomResults(q);
                this.customResults = parts[1];
                return parts[0];
            },
            //FF entry point
            //TODO: to be moved to Environment!
            startSearch: function(searchString, searchParam, previousResult, listener){
                this.search(searchString, function(results, ctx){
                    listener.onSearchResult(ctx, results);
                })
            },
            search: function(searchString, callback) {

                CliqzAutocomplete.lastQueryTime = Date.now();
                CliqzAutocomplete.lastDisplayTime = null;
                CliqzAutocomplete.lastResult = null;
                CliqzAutocomplete.lastSuggestions = null;
                this.oldPushLength = 0;
                this.customResults = null;
                this.latency = {
                    cliqz: null,
                    history: null,
                    backend: null,
                    mixed: null,
                    all: null
                };
                this.userRerankers = {};

                utils.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

                var invalidQ = isQinvalid(searchString.trim()),
                    action = {
                        type: 'activity',
                        action: 'key_stroke',
                        current_length: searchString.length,
                        invalid: invalidQ
                    };
                utils.telemetry(action);

                if(invalidQ) {
                    //we call the callback with no results to trigger a dropdown close
                    callback(null, this)
                    return;
                }

                if(CliqzAutocomplete.lastSearch.length > searchString.length) {
                  CliqzAutocomplete.spellCorr.override = true;
                }
                // analyse and modify query for custom results
                CliqzAutocomplete.lastSearch = searchString;
                searchString = this.analyzeQuery(searchString);

                // spell correction
                var urlbar = utils.getWindow().document.getElementById('urlbar');
                if (urlbar && //we do not have urlbar on mobile TODO - fix it better!
                    !CliqzAutocomplete.spellCorr.override &&
                    urlbar.selectionEnd == urlbar.selectionStart &&
                    urlbar.selectionEnd == urlbar.value.length) {
                    var parts = CliqzAutocomplete.spellCheck.check(searchString);
                    var newSearchString = parts[0];
                    var correctBack = parts[1];

                    for (var c in correctBack) {
                        CliqzAutocomplete.spellCorr.correctBack[c] = correctBack[c];
                    }

                } else {
                    // user don't want spell correction
                    var newSearchString = searchString;
                }
                this.wrongSearchString = searchString;
                if (newSearchString != searchString) {
                    // the local spell checker kicks in
                    var action = {
                        type: 'activity',
                        action: 'spell_correction',
                        current_length: searchString.length
                    }
                    utils.telemetry(action);
                    CliqzAutocomplete.spellCorr.on = true;
                    searchString = newSearchString;
                    CliqzAutocomplete.spellCorr['userConfirmed'] = false;
                }

                this.cliqzResults = null;
                this.cliqzResultsExtra = null;
                this.cliqzResultsParams = { };
                this.cliqzCache = null;
                this.historyResults = null;
                this.instant = [];

                this.callback = callback;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, // blocks autocomplete
                        '');

                this.startTime = Date.now();
                this.mixedResults.suggestionsRecieved = false;
                // ensure context
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                this.historyPatternCallback = this.historyPatternCallback.bind(this);
                this.createInstantResultCallback = this.createInstantResultCallback.bind(this);
                historyCluster.historyCallback = this.historyPatternCallback;
                if(searchString.trim().length){
                    // start fetching results
                    utils.getBackendResults(searchString, this.cliqzResultFetcher);
                    // if spell correction, no suggestions
                    if (CliqzAutocomplete.spellCorr.on && !CliqzAutocomplete.spellCorr.override) {
                        this.suggestionsRecieved = true;
                        // change the wrong string to the real wrong string
                        for (var p in CliqzAutocomplete.spellCorr.correctBack) {
                            if (this.wrongSearchString.indexOf(CliqzAutocomplete.spellCorr.correctBack[p]) == -1) {
                                this.wrongSearchString = this.wrongSearchString.replace(p, CliqzAutocomplete.spellCorr.correctBack[p]);
                            }
                        }
                        this.cliqzSuggestions = [searchString, this.wrongSearchString];
                        CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                        utils.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');

                        //TODO: extract spell corrector out of CliqzAutocomplete
                        if(urlbar)urlbar.mInputField.value = searchString;
                    } else {
                        //utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                    }
                    utils.clearTimeout(this.resultsTimer);
                    this.resultsTimer = utils.setTimeout(this.pushTimeoutCallback, utils.RESULTS_TIMEOUT, this.searchString);
                } else {
                    this.cliqzResults = [];
                    this.cliqzResultsExtra = [];
                    CliqzAutocomplete.resetSpellCorr();
                }

                // trigger history search
                utils.historySearch(
                    searchString,
                    this.onHistoryDone.bind(this),
                    CliqzAutocomplete.sessionStart);

                utils.clearTimeout(this.historyTimer);
                this.historyTimer = utils.setTimeout(this.historyTimeoutCallback, CliqzAutocomplete.HISTORY_TIMEOUT, this.searchString);
                this.historyTimeout = false;

                var hist_search_type = utils.getPref('hist_search_type', 0);
                if (hist_search_type != 0) {
                  CliqzUtils.log('Calling CliqzHM.cliqz_hm_search for: ' + searchString, 'CliqzHM');
                  this.cliqz_hm_search(this, {'query': searchString}, hist_search_type);
                }

            },
            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                utils.clearTimeout(this.resultsTimer);
                utils.clearTimeout(this.historyTimer);
            },

            sendResultsSignal: function(obj, instant) {
                var results = obj.mixedResults._results;
                var action = {
                    type: 'activity',
                    action: 'results',
                    query_length: CliqzAutocomplete.lastSearch.length,
                    result_order: CliqzAutocomplete.prepareResultOrder(results),
                    instant: instant,
                    popup: CliqzAutocomplete.isPopupOpen ? true : false,
                    latency_cliqz: obj.latency.cliqz,
                    latency_history: obj.historyTimeout ? null : obj.latency.history,
                    latency_patterns: obj.latency.patterns,
                    latency_backend: obj.latency.backend,
                    latency_mixed: obj.latency.mixed,
                    latency_all: obj.startTime? Date.now() - obj.startTime : null,
                    discarded: obj.discardedResults,
                    user_rerankers: obj.userRerankers,
                    backend_params: obj.cliqzResultsParams,
                    v: 1
                };

                // reset count of discarded backend results
                obj.discardedResults = 0;

                if (CliqzAutocomplete.lastAutocompleteActive) {
                  action.autocompleted = CliqzAutocomplete.lastAutocompleteActive;
                  action.autocompleted_length = CliqzAutocomplete.lastAutocompleteLength;
                }

                if (action.result_order.indexOf('C') > -1 && utils.getPref('logCluster', false)) {
                    action.Ctype = utils.getClusteringDomain(results[0].val);
                }

                if (CliqzAutocomplete.isPopupOpen) {
                    // don't mark as done if popup closed as the user does not see anything
                    CliqzAutocomplete.markResultsDone(Date.now());
                }

                // remembers if the popup was open for last result
                CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                if (results.length > 0) {
                    CliqzAutocomplete.lastDisplayTime = Date.now();
                }
                utils.telemetry(action);
            },

            // Wrap up after a completed search
            fullWrapup: function(obj) {
                obj.sendResultsSignal(obj, false);

                obj.startTime = null;
                utils.clearTimeout(obj.resultsTimer);
                utils.clearTimeout(obj.historyTimer);
                obj.resultsTimer = null;
                obj.historyTimer = null;
                obj.cliqzResults = null;
                obj.cliqzResultsExtra = null;
                obj.cliqzCache = null;
                obj.historyResults = null;
                obj.instant = [];
            },

            // Wrap up after instant results are shown
            instantWrapup: function(obj) {
                obj.sendResultsSignal(obj, true);
            },
        };
    },
};

CliqzAutocomplete.initProvider();
CliqzAutocomplete.initResults();

export default CliqzAutocomplete;
