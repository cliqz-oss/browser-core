import { utils, events } from "core/cliqz";
import { isFirefox } from "core/platform";
import SmartCliqzCache from 'autocomplete/smart-cliqz-cache/smart-cliqz-cache';
import TriggerUrlCache from 'autocomplete/smart-cliqz-cache/trigger-url-cache';
import CliqzAutocomplete from "autocomplete/autocomplete";
import historyCluster from "autocomplete/history-cluster";
import Result from "autocomplete/result";
import Mixer from "autocomplete/mixer";
import SpellCheck from "autocomplete/spell-check";
import console from "core/console";

class TimeoutError extends Error {}

function isQinvalid(q){
    //TODO: add more
    if(q.indexOf('view-source:') === 0) return true;

    return false;
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function timeout(promise, time) {
  const _timeout = delay(time).then( () => { throw new TimeoutError('Timeout') } );
  return Promise.race([promise, _timeout]);
}

function handleError(e) {
  return {
    reason: e,
    isInvalid: true,
  };
}

class ProviderAutoCompleteResultCliqz {
  constructor(searchString, searchResult, defaultIndex, errorDescription) {
    this._searchString = searchString;
    this._searchResult = searchResult;
    this._defaultIndex = defaultIndex;
    this._errorDescription = '';
    this._results = [];
  }

  get searchString() { return this._searchString; }
  get searchResult() { return this._searchResult; }
  get defaultIndex() { return this._defaultIndex; }
  get errorDescription() { return this._errorDescription; }
  get matchCount() { return this._results.length; }
  getValueAt(index) {
    var val = (this._results[index] || {}).val;
    if (this.getStyleAt(index).indexOf('switchtab') >= 0 && utils.dropDownStyle === 'ff') {
      val = "moz-action:switchtab," + JSON.stringify({url: val});
    }
    return val;
  }
  getFinalCompleteValueAt(index) { return this.getValueAt(index); }
  getCommentAt(index) { return (this._results[index] || {}).comment; }
  getStyleAt(index) { return (this._results[index] || {}).style; }
  getImageAt (index) { return (this._results[index] || {}).image || ''; }
  getLabelAt(index) {
    const val = this.getValueAt(index);
    if (val && val.indexOf('moz-action:') == 0 && utils.dropDownStyle === 'ff') {
      return val;
    } else {
      return (this._results[index] || {}).label;
    }

  }
  getDataAt(index) { return (this._results[index] || {}).data; }

  setResults(results){

      this._results = results;
      CliqzAutocomplete.lastResult = this;
      events.pub('autocomplete.new_result', { result: this, isPopupOpen: CliqzAutocomplete.isPopupOpen });
      var order = CliqzAutocomplete.getResultsOrder(this._results);
      utils.setResultOrder(order);

      // flag for rendering to avoid rendering of "unmixed" results
      this.isMixed = true;
  }

}

export default class Search {
  constructor() {
    this.TIMEOUT = 1000;
    this.HISTORY_TIMEOUT = 400;

    var mixerArgs = isFirefox ? {
      smartCliqzCache: new SmartCliqzCache(),
      triggerUrlCache: new TriggerUrlCache()
    } : {};
    this.mixer = new Mixer(mixerArgs);
    this.spellCheck = new SpellCheck();
    this.resultsTimer = null;
    this.historyTimer = null;
    this.historyTimeout = false;
    this.instant = [];
    CliqzAutocomplete.spellCheck = this.spellCheck;
    this.resultProviders = CliqzAutocomplete.CliqzResultProviders;
    this.rerankerTimeouts = {
      before: 30,
      during: this.TIMEOUT,
      after: 30
    }
  }

  search(searchString, callback) {
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

      console.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

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
        this.spellCheck.state.override = true;
      }
      // analyse and modify query for custom results
      CliqzAutocomplete.lastSearch = searchString;
      searchString = this.analyzeQuery(searchString);

      // spell correction
      var urlbar = utils.getWindow().document.getElementById('urlbar');
      if (urlbar && //we do not have urlbar on mobile TODO - fix it better!
          !this.spellCheck.state.override &&
          urlbar.selectionEnd == urlbar.selectionStart &&
          urlbar.selectionEnd == urlbar.value.length) {
          var parts = CliqzAutocomplete.spellCheck.check(searchString);
          var newSearchString = parts[0];
          var correctBack = parts[1];

          for (var c in correctBack) {
              this.spellCheck.state.correctBack[c] = correctBack[c];
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
          this.spellCheck.state.on = true;
          searchString = newSearchString;
          this.spellCheck.state.userConfirmed = false;
      }

      this.cliqzResults = [];
      this.cliqzResultsParams = { };
      this.cliqzCache = null;
      this.historyResults = null;
      this.instant = [];

      this.callback = callback;
      this.searchString = searchString;
      this.searchStringSuggest = null;
      const defaultIndex = utils.dropDownStyle == 'ff' ? 0 : -2; // -2 blocks default FF autocomplete
      this.mixedResults = new ProviderAutoCompleteResultCliqz(
              this.searchString,
              Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
              defaultIndex, // blocks autocomplete
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
          this.getSearchResults(searchString).then(this.cliqzResultFetcher);

          // if spell correction, no suggestions
          if (this.spellCheck.state.on && !this.spellCheck.state.override) {
              this.suggestionsRecieved = true;
              // change the wrong string to the real wrong string
              for (var p in this.spellCheck.state.correctBack) {
                  if (this.wrongSearchString.indexOf(this.spellCheck.state.correctBack[p]) == -1) {
                      this.wrongSearchString = this.wrongSearchString.replace(p, this.spellCheck.state.correctBack[p]);
                  }
              }
              this.cliqzSuggestions = [searchString, this.wrongSearchString];
              CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
              console.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');

              //TODO: extract spell corrector out of CliqzAutocomplete
              if(urlbar)urlbar.mInputField.value = searchString;
          } else {
              //utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
          }
          utils.clearTimeout(this.resultsTimer);
          this.resultsTimer = utils.setTimeout(this.pushTimeoutCallback, utils.RESULTS_TIMEOUT, this.searchString);
      } else {
          this.cliqzResults = [];
          CliqzAutocomplete.spellCheck.resetState();
      }

      utils.clearTimeout(this.historyTimer);
      this.historyTimer = utils.setTimeout(this.historyTimeoutCallback, this.HISTORY_TIMEOUT, this.searchString);
      this.historyTimeout = false;
      // trigger history search
      utils.historySearch(searchString, this.onHistoryDone.bind(this));

      var hist_search_type = utils.getPref('hist_search_type', 0);
      if (hist_search_type != 0) {
        console.log('Calling CliqzHM.cliqz_hm_search for: ' + searchString, 'CliqzHM');
        this.cliqz_hm_search(this, {'query': searchString}, hist_search_type);
      }

  }

  static fetchAndCacheResult(query, fun) {
    return fun(query);
  }

  cliqz_hm_search(_this, res, hist_search_type) {
      var data = null;
      var query = res.query || res.q; // query will be called q if RH is down
      if (hist_search_type === 1) {
        data = utils.hm.do_search(query, false);
        data['cont'] = null;
      }
      else {
        data = utils.hm.do_search(query, true);
      }

      var urlAuto = utils.hm.urlForAutoLoad(data);
      if (false && urlAuto) {
        var win = utils.getWindow().gBrowser.contentWindow;
        //if (CliqzAutocomplete.currentAutoLoadURL==null || win.location.href=='about:cliqz') {
          if (win.location.href!=urlAuto) {
              console.log(">> AUTOLOAD LAUNCH: " + urlAuto, 'CliqzHM');
              win.location.href = urlAuto;
              CliqzAutocomplete.currentAutoLoadURL = urlAuto;
          }
        //}
      }

      // Extract results
      var patterns = [];
      for (var i = 0; i < data.result.length; i++) {
        var url = utils.cleanMozillaActions(data.result[i][0])[1],
            title = data.result[i][1];

        if (!title || title == 'N/A') {
          title = utils.generalizeUrl(url);
        }

        if (title.length > 0 && url.length > 0 && Result.isValid(url, utils.getDetailsFromUrl(url))) {
          var item = {
            url: url,
            title: title,
            favicon: null, //history.results[i].image,
            _genUrl: utils.generalizeUrl(url, true),
          };
          if (data.result[i][3]) {
            if (data.result[i][3].hasOwnProperty('c')) {
              item['xtra_c'] = data.result[i][3]['c'];
            }
            if (data.result[i][3].hasOwnProperty('q')) {
              item['xtra_q'] = data.result[i][3]['q'];
            }
          }
          patterns.push(item);
        }
        var cont = null;
        if (data.hasOwnProperty('cont')) {
          cont = data['cont'];
        }
      }

      if(patterns.length >0){
        var res3 = historyCluster._simplePreparePatterns(patterns, query);
        // This is also causing undefined issue. Specifically when the res.length == 0;
        if(res3.results.length == 0){
          res3.results.push({"url": query,"title": "Found no result in local history for query: ","favicon": "","_genUrl": "","base": true,"debug": ""})
        }
        historyCluster.simpleCreateInstantResult(res3, cont,  _this.searchString, function(kk2) {
          var vjoin = [];
          vjoin.push(kk2[0]);
          _this.createInstantResultCallback(vjoin, 'hm');
        });
      }

  }

  getSearchResults(searchString) {

    const beforeResults = Promise.all(
      utils.RERANKERS.map(reranker => {
        const promise = reranker.beforeResults ? reranker.beforeResults.bind(reranker) : Promise.resolve.bind(Promise);
        return timeout(
          promise({query: searchString}),
          this.rerankerTimeouts.before
        ).catch(handleError);
      })
    );

    const duringResults = beforeResults.then(resultsArray => {
      const duringResultsPromises = utils.RERANKERS.map((reranker, idx) => {
        const promise = reranker.duringResults ? reranker.duringResults.bind(reranker) : Promise.resolve.bind(Promise);
        return timeout(
          promise(resultsArray[idx]),
          this.rerankerTimeouts.during
        );
      });
      return Promise.all(
        [
          ...duringResultsPromises,
          Search.fetchAndCacheResult(searchString, utils.getBackendResults),
        ].map(promise => promise.catch(handleError))
      );
    });

    const afterResults = duringResults.then(results => {
      const backendResults = results.pop();
      return results.reduce((results, rerankerResults, index) => {
        if (!utils.RERANKERS[index].afterResults) {
          return results;
        }

        return results.then(x =>
          timeout(
            utils.RERANKERS[index].afterResults(rerankerResults, x),
            this.rerankerTimeouts.after
          ).catch(() => results).then((res) => {
            if (!res.isInvalid && res.response && res.response.telemetrySignal) {
              this.userRerankers[utils.RERANKERS[index].name] = res.response.telemetrySignal;
            }
            return res;
          })
        );
      }, Promise.resolve(backendResults));
    });

    return afterResults;
  }

  historyTimeoutCallback(params) {
      console.log('History timeout', CliqzAutocomplete.LOG_KEY);
      this.historyTimeout = true;

      // push all the history results we managed to when the timeout occured
      if (this.historyResults) {
          historyCluster.addFirefoxHistory(this.historyResults);
      } else {
          this.pushResults(this.searchString);
      }
  }

  onHistoryDone(result) {
      if(!this.startTime) {
          return; // no current search, just discard
      }

      var now = Date.now();

      this.historyResults = result;
      this.latency.history = now - this.startTime;

      if(this.isHistoryReady()) {
          // history is ready -> push to UI
          historyCluster.addFirefoxHistory(result);

          // we cancel the history timout timer to avoid having a
          // random call out of the blue
          utils.clearTimeout(this.historyTimer);
      } else {
        // history is not ready lets try to add an instant result
        if(this.isHistoryNotEmpty() && (this.instant || []).length == 0) {
            historyCluster.addFirefoxHistory(result);
        }
      }
  }

  isHistoryReady() {
      return this.historyResults && this.historyResults.ready;
  }

  isHistoryNotEmpty() {
      return this.historyResults && this.historyResults.results && this.historyResults.results.length > 0;
  }

  historyPatternCallback(res) {
      // abort if we already have results
    var query = res.query || res.q || ''; // query will be called q if RH is down
    if(this.mixedResults.matchCount > 0) return;

    if (query == this.searchString) {
      CliqzAutocomplete.lastPattern = res;
      var latency = 0;
      if (historyCluster.latencies[query]) {
        latency = (new Date()).getTime() - historyCluster.latencies[query];
      }
      this.latency.patterns = latency;
      // Create instant result
      historyCluster.createInstantResult(res, this.searchString, this.createInstantResultCallback, this.customResults);
    }
  }

  createInstantResultCallback(instant, type_res) {
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
  }

  pushTimeoutCallback(params) {
    console.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
    this.pushResults(params);
  }

  // checks if all the results are ready or if the timeout is exceeded
  pushResults(q) {
      if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
        var now = Date.now();

       if((now > this.startTime + utils.RESULTS_TIMEOUT) || // do we have a timeout or
           (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out and
            this.cliqzResults.length > 0) {                  // backend results are ready
          /// Push full result
          utils.clearTimeout(this.resultsTimer);
          utils.clearTimeout(this.historyTimer);
          this.prepareResults(q);
          this.mixResults(false);

          this.latency.mixed = Date.now() - this.startTime;

          this.callback(this.mixedResults, this);

          this.latency.all = Date.now() - this.startTime;

          // delay wrapping to make sure rendering is complete
          // otherwise we don't get up to date autocomplete stats
          utils.setTimeout(this.fullWrapup.bind(this), 0, this);

          return;
        } else if(this.isHistoryReady()) {
          /// Push instant result
          this.latency.mixed = Date.now() - this.startTime;
          this.prepareResults(q);
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
  }

  loadIncompleteResults(json, q, attemptsSoFar) {
    if (attemptsSoFar > this.REFETCH_MAX_ATTEMPTS) {
      return;
    }

    var incompleteResults = {};
    json.results.forEach(function(r, i) {
      if (r._incomplete) {
        var key = r.trigger_method == 'query' ? 'query': r.url;
        incompleteResults[key] = {
          index: i,
          result: r
        };
      }
    });

    if (Object.keys(incompleteResults).length > 0) {
      this.waitingForPromise = true;
      var data = JSON.stringify({
        q: q,
        results: Object.keys(incompleteResults).map(k=>incompleteResults[k]).filter(
          r => this.isReadyToRender(r.result)
        ).map(
          r => ({
            snippet: r.result.snippet,
            template: r.result.template,
            url: r.result.url
          })
        )
      });
      var url = utils.RICH_HEADER + utils.getRichHeaderQueryString(q);


      utils.httpPut(url, (req) => {
        var resp = JSON.parse(req.response);
        var newResultSetIndex = {};
        resp.results.forEach(function(result) {
          var key = result.trigger_method == 'query' ? 'query': result.url;
          var oldRes = incompleteResults[key];
          newResultSetIndex[key] = result;
          if (oldRes) {
            json.results[oldRes.index] = result;
          }
        });
        /* We need to remove results that were promised, but didn't arrive */
        Object.keys(incompleteResults).forEach(function(key) {
          if (newResultSetIndex[key] == undefined) {
            json.results.splice(incompleteResults[key].index, 1);
          }
        });
        /*
           Now json.results contains only ready results & NEW promises
           (promises from the previous result set were removed)
        */
        this.waitingForPromise = false;
        this.cliqzResultFetcher({response: json, query: q}, attemptsSoFar);
      }, data);
    }
  }

  isReadyToRender(result) {
    /*
      RH promises that were triggered by query should not be rendered
      immediately. The ones that were triggered by the BM url can be
      rendered as a generic result.
    */
    return result && result.url != 'n/a' && !(
      result._incomplete &&
      result.type == 'rh'  &&
      result.trigger_method == 'query'
    );
  }

  enhanceResult(r, i) {
    var subType = r.subType || {};
    if (r.type == 'rh') {
      subType.trigger_method = 'rh_query';
      delete subType.id;
      delete subType.name;
      subType.ez = 'deprecated';
    }
    subType.i = i;
    subType.cs = r.cs ? 1 : 0;
    r.subType = subType;
    return r;
  }

  // handles fetched results from the cache
  cliqzResultFetcher(res, attemptsSoFar) {
      var json = res.response,
          q = res.query || res.q; // query will be called q if RH is down
      if (['simple', 'ff'].indexOf(utils.dropDownStyle) > -1) {
        // Remove query-triggered RH results (smart cliqz) in simple UI && FF UI
        json.results = json.results.filter((r) => {
          return !(r.type === 'rh' && r.trigger_method === 'query');
        });
      }
      // be sure this is not a delayed result
      if(q != this.searchString) {
          this.discardedResults += 1; // count results discarded from backend because they were out of date
      } else {
          this.latency.backend = Date.now() - this.startTime;
          setTimeout(this.loadIncompleteResults.bind(this), 0,
                     json,
                     q,
                     (attemptsSoFar || 0) + 1);
          this.cliqzResults = json.results.filter(this.isReadyToRender).map(this.enhanceResult);

          this.cliqzResultsParams = {
            choice: json.choice,
          };
          this.latency.cliqz = json.duration;

          this.client_cached = json.isClientCached;
      }
      this.pushResults(q);
  }

  prepareResults(q) {
    this.instant = (this.instant || []).map(function(r) {
      r = Result.clone(r);
      if (!r.data.template || utils.isUnknownTemplate(r.data.template)) {
        r.data.template = 'generic';
      }
      return r;
    });

    this.cliqzResults = this.cliqzResults.map(function(r, i) {
      return Result.cliqz(r, q);
    });
  }


  // mixes backend results, entity zones, history and custom results
  mixResults(only_instant) {
    // set first history entry as autocompleted if it was
    if(this.instant.length > 0 &&
       CliqzAutocomplete.lastAutocompleteActive && !only_instant) {
      this.instant[0].autocompleted = true;
    }
    var results = this.mixer.mix(
                this.searchString,
                this.cliqzResults,
                this.instant,
                this.customResults,
                only_instant
        );
    CliqzAutocomplete.lastResultIsInstant = only_instant;
    CliqzAutocomplete.afterQueryCount = 0;
    this.mixedResults.setResults(results);

  }

  analyzeQuery(q){
      var parts = this.resultProviders.getCustomResults(q);
      this.customResults = parts[1];
      return parts[0];
  }

  sendResultsSignal(obj, instant) {
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
          proxied: utils.getPref('hpn-query', false),
          client_cached: Boolean(obj.client_cached),
          v: 1,
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
  }

  // Wrap up after a completed search
  fullWrapup(obj) {
    if (!this.waitingForPromise) {
      obj.sendResultsSignal(obj, false);
      obj.startTime = null;
      utils.clearTimeout(obj.resultsTimer);
      utils.clearTimeout(obj.historyTimer);
      obj.resultsTimer = null;
      obj.historyTimer = null;
      obj.cliqzResults = [];
      obj.cliqzCache = null;
      obj.historyResults = null;
      obj.instant = [];
    }
  }

  // Wrap up after instant results are shown
  instantWrapup(obj) {
      obj.sendResultsSignal(obj, true);
  }
}
