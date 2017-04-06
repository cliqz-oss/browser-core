import { utils } from "core/cliqz";
import Result from "autocomplete/result";
import HistoryManager from "core/history-manager";

var FF_DEF_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon.png',
    Q_DEF_FAVICON = utils.SKIN_PATH + 'defaultFavicon.png';

var CliqzHistoryCluster = {
  historyCallback: null,
  latencies: [],

  // Generate result json from patterns
  _generateResult: function(patterns, query, cluster, baseUrl) {
    if (!patterns) {
      patterns = [];
    }
    return {
      query: query,
      cluster: cluster,
      top_domain: baseUrl || CliqzHistoryCluster._maxDomainShare(patterns)[0],
      results: patterns,
      filteredResults: function() {
        var self = this;
        return this.results.filter(function(r) {
          return r.title && utils.getDetailsFromUrl(r.url).name == utils.getDetailsFromUrl(self.top_domain).name;
        });
      }
    };
  },
  // This method is triggered when the Firefox history has finished loading
  addFirefoxHistory: function(history) {
    var query = history.query;
    var res;

    // Extract results
    var patterns = [];
    for (var i = 0; i < history.results.length; i++) {
      var parts = utils.cleanMozillaActions(history.results[i].value);
      var url = parts[1],
          action = parts[0],
          title = history.results[i].comment;
      // Filters out results with value: "moz-action:searchengine,{"engineName":"Google","input":"awz","searchQuery":"awz"}"
      // that are returned from the unifiedcomplete history provider that is the only provider from Firefox 49.0 on
      if (action === 'searchengine'){
        continue;
      }

      if (!title) {
        title = utils.generalizeUrl(url);
      }

      if (title.length > 0 && url.length > 0 &&
          Result.isValid(url, utils.getDetailsFromUrl(url))) {

        patterns.push({
          url: url,
          title: title,
          favicon: history.results[i].image,
          style: history.results[i].style,
          _genUrl: utils.generalizeUrl(url, true)
        });
      }
    }
    // Process patterns
    res = CliqzHistoryCluster._preparePatterns(patterns, query);
    CliqzHistoryCluster.historyCallback(res);
  },
  _simplePreparePatterns: function(patterns, query) {
    var baseUrl, favicon, orig_query = query;

    query = utils.cleanUrlProtocol(query, true).trim();

    // Filter patterns that don't match search
    //patterns = CliqzHistoryCluster._filterPatterns(patterns, query.toLowerCase());
    //var share = CliqzHistoryCluster._maxDomainShare(patterns);

    // Remove patterns with same url or title
    //patterns = CliqzHistoryCluster._removeDuplicates(patterns);

    // Move base domain to top
    //var adjustedResults = CliqzHistoryCluster._adjustBaseDomain(patterns, query);
    //patterns = adjustedResults[0];
    //baseUrl = adjustedResults[1];
    //favicon = adjustedResults[2];
    //var https = adjustedResults[3];
    var res = CliqzHistoryCluster._generateResult(patterns, orig_query, false, baseUrl);

    res.cluster = false;

    res.results = CliqzHistoryCluster._removeDuplicates(res.results);
    return res;
  },

  // Process patterns
  _preparePatterns: function(patterns, query) {
    var baseUrl, favicon, orig_query = query;

    query = utils.cleanUrlProtocol(query, true).trim();

    // Filter patterns that don't match search
    patterns = CliqzHistoryCluster._filterPatterns(patterns, query.toLowerCase());
    var share = CliqzHistoryCluster._maxDomainShare(patterns);

    // Remove patterns with same url or title
    patterns = CliqzHistoryCluster._removeDuplicates(patterns);

    // Move base domain to top
    var adjustedResults = CliqzHistoryCluster._adjustBaseDomain(patterns, query);
    patterns = adjustedResults[0];
    baseUrl = adjustedResults[1];
    favicon = adjustedResults[2];
    var https = adjustedResults[3];
    var res = CliqzHistoryCluster._generateResult(patterns, orig_query, false, baseUrl);

    // Add base domain if above threshold
    var fRes = res.filteredResults();
    var genQ = utils.generalizeUrl(query);
    if (share[1] > 0.5 && fRes.length > 2 &&
       !(utils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0 && share[1] < 0.8)) {
      // Check if base domain changed due to filtering
      var tmpBaseUrl = CliqzHistoryCluster._adjustBaseDomain(fRes, query)[1];
      baseUrl = tmpBaseUrl;
      CliqzHistoryCluster._addBaseDomain(patterns, baseUrl, favicon, https);
      res.cluster = true;
    // Threshold not reached or clustering not enabled -> no domain clustering
    } else {
      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };
    }

    // Remove automatically added patterns if they don't match query
    if (patterns && patterns.length > 0 &&
       patterns[0].autoAdd &&
       utils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0) {
      patterns.shift();
      res.cluster = false;
    }

    res.results = CliqzHistoryCluster._removeDuplicates(res.results);
    return res;
  },

  // Calculates the _weighted_ share of the most common domain in given patterns
  _maxDomainShare: function(patterns) {
    var patternCount = patterns.length;
    // boost the first X domain entries (i.e., within boostRange)
    var boostRange = 3;
    // weight for the first X entries, all other entries have weight of 1;
    // this makes the first X entries as important as the remaining (N - X) entries
    var boostFactor = (patternCount - boostRange) / (1 * boostRange);

    // make sure the first results do not become less important, which happens if
    // if there are only very few patterns (i.e, patternCount < boostRange * 2)
    boostFactor = Math.max(1, boostFactor);

    var domains = new Map();
    var index = 0;

    for (var key in patterns) {
      var url = patterns[key].url, domainName;

      // only consider http(s) urls for patterns
      if(url.indexOf('http://') === 0 || url.indexOf('https://') === 0 ){
        domainName = utils.getDetailsFromUrl(url).domain;
      }

      // assign a higher weight to this domain entry if it is one of the first N entries
      var weightedCount = index < boostRange ? boostFactor : 1;
      var prevValue = domains.get(domainName) || 0;
      domains.set(domainName, prevValue + weightedCount);
      index++;
    }
    var max = 0.0,
        cnt = 0.0;
    var mainDomain = null;
    for (var [domain, value] of domains.entries()) {
      cnt += value;
      if (value > max && domain) {
       max = value;
       mainDomain = domain;
      }
    }

    return [mainDomain, max / cnt];
  },
  _filterPatterns: function(patterns, full_query) {
    var queries = full_query.trim().split(' ');
    var newPatterns = [];
    for (var key in patterns) {
      var match = true;
      // Check all queries for matches
      for (var wordKey in queries) {
        var titleUrlMatch = false;
        if (patterns[key].url.indexOf(queries[wordKey]) != -1 ||
          ((patterns[key].title || '').toLowerCase().indexOf(queries[wordKey]) != -1)) {
          titleUrlMatch = true;
        }
        var queryMatch = false;
        for (var qkey in patterns[key].query) {
          var q = patterns[key].query[qkey];
          if (q.indexOf(queries[wordKey]) != -1) {
            queryMatch = true;
            break;
          }
        }
        if (!queryMatch && !titleUrlMatch) {
          match = false;
          break;
        }
      }
      if (match) newPatterns.push(patterns[key]);
    }
    return newPatterns;
  },
  // Deduplicate URLs and titles
  _removeDuplicates: function(patterns) {
    var newPatterns;
    newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(patterns, '_genUrl');
    newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(newPatterns, 'title');
    return newPatterns;
  },
  // Deduplicate entries by value of key, with a preference for https and proper titles
  _removeDuplicatesByKey: function(patterns, key) {
    var reorg = {};
    var order = [];

    var value;

    // Pass 1: group similar entries by key
    for (var i = 0; i < patterns.length; i++) {
      value = patterns[i][key];
      if (!reorg.hasOwnProperty(value)) {
        order.push(value);
        reorg[value] = [];
      }
      reorg[value].push(patterns[i]);
    }

    // Pass 2: take the best entry from each group
    // and add to newPatterns in original order.
    var newPatterns = [];
    for (i = 0; i < order.length; i++) {
      value = order[i];

      if (reorg[value].length == 1) {
        newPatterns.push(reorg[value][0]);
        continue;
      }

      // Separate http and https links
      var https = [],
          http = [];
      for (var j = 0; j < reorg[value].length; j++) {
        if (reorg[value][j].url.indexOf('https://') === 0) {
          https.push(reorg[value][j]);
        } else {
          http.push(reorg[value][j]);
        }
      }

      // if any https links, proceed with them only
      var candidates;
      if (https.length > 0)
        candidates = https;
      else
        candidates = http;

      // Pick the one with a "real" title.
      // Some history entries will have a title the same as the URL,
      // don't use these if possible.
      var found = false;
      for (var x = 0; x < candidates.length; x++) {
        if (!(candidates[x].title == candidates[x]._genUrl ||
             candidates[x].title == 'www.' + candidates[x]._genUrl ||
             candidates[x].title == candidates[x].url)) {
          newPatterns.push(candidates[x]);
          found = true;
          break;
        }
      }
      if (!found)
        newPatterns.push(candidates[0]);
    }

    return newPatterns;
  },
  // Search all patterns for matching substring (should be domain)
  _findCommonDomain: function(patterns) {
    if (patterns.length < 2) {
      return null;
    }
    var scores = {};

    for (var key in patterns) {
      var url1 = patterns[key]._genUrl;
      scores[url1] = true;
      for (var key2 in patterns) {
        var url2 = patterns[key2]._genUrl;
        if (key != key2 && url2.indexOf(url1) == -1) {
          scores[url1] = false;
        }
      }
    }

    // Return match with most occurences
    for (var scorekey in scores) {
      if (scores[scorekey] === true) {
        return scorekey;
      }
    }
    return null;
  },
  // Move base domain to top
  _adjustBaseDomain: function(patterns, query) {
    if (patterns.length === 0) {
      return [];
    }
    var basePattern = null, baseUrl = null, favicon = null,
        commonDomain = CliqzHistoryCluster._findCommonDomain(patterns);

    // Check for url matching query
    query = utils.generalizeUrl(query, true);
    if(query){
      for (let key in patterns) {
        var url = patterns[key].url;
        if (url.indexOf(query) === 0) {
          baseUrl = url;
          favicon = patterns[key].favicon;
          break;
        }
      }
    }

    // if none found, use the first entry
    if (!baseUrl) {
      baseUrl = patterns[0]._genUrl;
      favicon = patterns[0].favicon;
    }

    baseUrl = commonDomain || baseUrl.split('/')[0];

    // find if there is an entry matching the base URL.
    var pUrl;
    for (var i = 0; i < patterns.length; i++) {
      pUrl = patterns[i]._genUrl;
      if (baseUrl == pUrl) {
        basePattern = patterns[i];
        break;
      }
    }
    var https = false;
    var newPatterns = [];
    if (basePattern) {
      // found a history entry representing the base pattern,
      // use at the first entry in newPatterns
      basePattern.base = true;
      patterns[0].debug = 'Replaced by base domain';
      newPatterns.push(basePattern);

    } else {
      utils.log('Using a base url that did not exist in history list.', 'CliqzHistoryCluster');

      for (let key in patterns) {
        // if any pattern uses an https domain, try to use that for
        // base domain too.
        pUrl = patterns[key].url;
        if (pUrl.indexOf('https://') === 0) {
          https = true;
          break;
        }

        // Add https if required
        if (https) {
          // ...but only if there is a history entry with title
          if (HistoryManager.getPageTitle('https://' + baseUrl)) {
            utils.log('found https base URL with title', 'CliqzHistoryCluster');
            // keep https as true
          } else {
            utils.log('no https base URL with title, do not change original base URL', 'CliqzHistoryCluster');
            https = false;
          }
        }
      }
    }

    for (let key in patterns) {
      // keep everything else except for base, it is already there
      if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
    }
    return [newPatterns, baseUrl, favicon, https];
  },
  // Add base domain of given result to top of patterns, if necessary
  _addBaseDomain: function(patterns, baseUrl, favicon, https) {
    baseUrl = utils.generalizeUrl(baseUrl, true);
    // Add base domain entry if there is not one already
    if (patterns && patterns.length > 0 && !patterns[0].base) {
      var title = utils.getDetailsFromUrl(baseUrl).domain;
      if (!title) {
        utils.log('Failed to add base domain because there is no title: ' + baseUrl, 'CliqzHistoryCluster');
        return;
      }

      utils.log('Adding base domain to history cluster: ' + baseUrl, 'CliqzHistoryCluster');

      // Add trailing slash if not there
      var urldetails = utils.getDetailsFromUrl(baseUrl);
      if (urldetails.path === '')
        baseUrl = baseUrl + '/';

      patterns.unshift({
        title: title.charAt(0).toUpperCase() + title.split('.')[0].slice(1),
        url: baseUrl,
        favicon: favicon
      });
      patterns[0].autoAdd = true;
    }
  },
  // Autocomplete an urlbar value with the given patterns
  autocompleteTerm: function(urlbar, pattern, loose) {
    var MAX_AUTOCOMPLETE_LENGTH = 80; // max length of autocomplete portion

    function matchQuery(queries) {
      var query = '';
      for (var key in queries) {
        var q = queries[key].toLowerCase();
        if (q.indexOf(input) === 0 && q.length > query.length) {
          query = q;
        }
      }
      return query;
    }
    if (urlbar == 'www.' || urlbar == 'http://' || urlbar.substr(urlbar.indexOf('://') + 3) == 'www.' || urlbar === '')
      return {};

    var url = utils.simplifyUrl(pattern.url);
    url = utils.generalizeUrl(url, true);
    var input = utils.generalizeUrl(urlbar);
    if (urlbar[urlbar.length - 1] == '/') input += '/';

    var autocomplete = false,
      highlight = false,
      selectionStart = 0,
      urlbarCompleted = '';
    var queryMatch = matchQuery(pattern.query);

    // Url
    if (url.indexOf(input) === 0 && url != input &&
       (url.length - input.length) <= MAX_AUTOCOMPLETE_LENGTH) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
    }

    if (autocomplete) {
      selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
    }

    // Adjust url to user protocol
    if (urlbar.indexOf('://') != -1) {
      var prot_user = urlbar.substr(0, urlbar.indexOf('://') + 3);
      var prot_auto = pattern.url.substr(0, pattern.url.indexOf('://') + 3);
      pattern.url = pattern.url.replace(prot_auto, prot_user);
    }

    return {
      url: url,
      full_url: pattern.url,
      autocomplete: autocomplete,
      urlbar: urlbarCompleted,
      selectionStart: selectionStart,
      highlight: highlight
    };
  },

  // Attach a list of URLs to a cluster result
  _attachURLs: function(result, urls, with_favicon) {
    result.data.urls = [];

    for (var i = 0; i < urls.length; i++) {
      var domain = utils.generalizeUrl(urls[i].url, true).split('/')[0],
          url = urls[i].url;

      if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);

      var favicon = with_favicon && (urls[i].favicon == FF_DEF_FAVICON ? Q_DEF_FAVICON : urls[i].favicon),
          cleanUrl = utils.cleanUrlProtocol(utils.simplifyUrl(url), true);

      var item = {
        href: urls[i].url,
        link: cleanUrl,
        domain: cleanUrl.split('/')[0],
        title: urls[i].title,
        extra: 'history-' + i,
        favicon: favicon,
        kind: ['H'],
        style: urls[i].style
      };
      // logo is only necessary for 3-up mini-history view, this can be removed if that is retired
      if (urls[i].url && urls[i].url.toLowerCase().startsWith("http"))
        item.logo = utils.getLogoDetails(utils.getDetailsFromUrl(urls[i].url));

      if (urls[i].hasOwnProperty('xtra_c')) {
        item['xtra_c'] = urls[i]['xtra_c'];
        item['class-col-cluster'] = 'cqz-col-12';
        //item['class-col-query'] = 'cqz-col-0';
      }

      if (urls[i].hasOwnProperty('xtra_q')) {
        item['xtra_q'] = urls[i]['xtra_q'];
        item['class-col-cluster'] = 'cqz-col-8';
        item['class-col-query'] = 'cqz-col-4';
      }

      result.data.urls.push(item);

      if ((result.data.urls.length > 9 && result.data.template == 'pattern-h1') ||
          (result.data.urls.length > 5 && result.data.template == 'pattern-h2') ||
          (result.data.urls.length > 2 && result.data.template == 'pattern-h3')) {
        break;
      }
    }
  },
  // Creates one (or potentially more) instant results based on history
  createInstantResult: function(res, searchString, callback, customResults) {
    var instant_results = [];
    var results = res.filteredResults();
    var promises = [];

    if (results.length === 0 && !res.urls) {
      // no results, so do nothing

    } else if (res.urls) {
      // Rule-based clustering has already been performed, just take the entry as it is
      var instant = Result.generic('cliqz-pattern', res.url, res.urls[0].favicon, res.title, null, searchString, res);
      instant.data.debug ='(history rules cluster)!';
      // override with any titles we have saved
      //promises.push(CliqzHistoryCluster._getTitle(instant));

      instant.data.template = 'pattern-h2';
      instant.data.cluster = true; // a history cluster based on a destination bet
      instant_results.push(instant);

    } else if (searchString.length === 0 && customResults === null ) {
      // special case for user request of top sites from history
      var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
      instant.data.title = utils.getLocalizedString('history_results_cluster');
      instant.data.url = results[0].url;
      instant.data.debug = '(history top sites)!';
      instant.data.template = 'pattern-h1';
      instant.data.generic = true;

      this._attachURLs(instant, results);

      instant_results.push(instant);

    } else if (res.cluster) {
      // domain-based cluster
      var instant = Result.generic('cliqz-pattern', results[0].url, results[0].favicon, results[0].title, null, searchString);
      var title = results[0].title;
      if (!title) {
        title = results[0].url;
        utils.log('No title, assigning ' + title, 'CliqzHistoryCluster');
      }
      instant.data.localSource = results[0].style;
      instant.data.title = title;
      // override with any titles we have saved
      //promises.push(CliqzHistoryCluster._getTitle(instant));

      // get description in case we need it
      //(if this cluster is converted back to simple history)
      //promises.push(CliqzHistoryCluster._getDescription(instant));

      instant.data.url = results[0].url;
      instant.data.debug = '(history domain cluster)!';
      instant.data.template = 'pattern-h2';
      instant.data.autoAdd = results[0].autoAdd;
      instant.data.cluster = true; // a history cluster based on a destination bet

      // first entry is used as the main URL of this cluster, remove from remaining result list
      results.shift();

      CliqzHistoryCluster._attachURLs(instant, results);

      instant_results.push(instant);

    } else if (results.length < 3) {
      for (var i = 0; i < results.length; i++) {
        var instant = Result.generic('favicon', results[i].url, results[i].favicon, results[i].title, null, searchString);
        instant.data.title = instant.comment;
        instant.data.debug = '(history generic)!';
        instant.data.kind = ['H'];
        instant.data.localSource = results[i].style;
        //promises.push(CliqzHistoryCluster._getDescription(instant));
        instant_results.push(instant);
      }
    } else {
      // 3-up combined generic history entry
      var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
      instant.data.title = instant.comment;
      instant.data.debug = '(history generic)!';
      instant.data.template = 'pattern-h3';
      instant.data.generic = true;

      this._attachURLs(instant, results, true);
      instant_results.push(instant);
    }

    if (typeof(Promise) === 'undefined') {
      // Firefox versions < 29
      callback(instant_results, 'cliqz-prod');
    } else {
      Promise.all(promises).then(function(data) {
        callback(instant_results, 'cliqz-prod');
      });
    }
  },
  // Creates one (or potentially more) instant results based on history
  simpleCreateInstantResult: function(res, cont, searchString, callback) {
    var instant_results = [];
    //var results = res.filteredResults();
    var results = res.results;
    var promises = [];

    if (results.length === 0 && !res.urls) {
      // no results, so do nothing

    } else {
      // generic history
      var simple_generic = utils.getPref('simpleHistory', false);
      //var simple_generic = true;

      // 3-up combined generic history entry
      var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
      instant.data.title = instant.comment;
      instant.data.debug = '(history generic)!';

      //
      // There is so many levels of abstraction here that is impossible to follow,
      // 5 function to be able to printout something, stack overflow :-/
      //
      instant.data.template = 'pattern-hm';
      //instant.data.template = 'pattern-h3';

      instant.data.generic = true;

      instant.data.cont = cont;

      this._attachURLs(instant, results, true);

      instant_results.push(instant);
    }

    if (typeof(Promise) === 'undefined') {
      // Firefox versions < 29
      callback(instant_results, 'hm');
    } else {
      Promise.all(promises).then(function(data) {
        callback(instant_results, 'hm');
      });
    }
  },
  // Removes a given url from the instant.data.url list
  removeUrlFromResult: function(urlList, _url) {
    var url = utils.generalizeUrl(_url);
    for (var key in urlList) {
      var r_url = utils.generalizeUrl(urlList[key].href);
      if (r_url == url) {
        urlList.splice(key, 1);
        return;
      }
    }
  }
};

export default CliqzHistoryCluster;
