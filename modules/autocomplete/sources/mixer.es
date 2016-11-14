/*
 * This module mixes the results from cliqz with the history
 *
 */

import { utils } from "core/cliqz";
import Result from "autocomplete/result";
import UrlCompare from "autocomplete/url-compare";


function objectExtend(target, obj) {
  Object.keys(obj).forEach(function(key) {
    target[key] = obj[key];
  });

  return target;
}

// enriches data kind
function kindEnricher(newKindParams, kind) {
  var parts = kind.split('|'),
      params = JSON.parse(parts[1] || '{}');

  objectExtend(params, newKindParams);

  return parts[0] + '|' + JSON.stringify(params);
}

function resultKindEnricher(newKindParams, result) {
  result.data.kind[0] = kindEnricher(newKindParams, result.data.kind[0]);
  return result;
}

export default class Mixer {
  constructor({ smartCliqzCache, triggerUrlCache } = {}) {
    this.EZ_COMBINE = [
      'entity-generic', 'ez-generic-2', 'entity-search-1',
      'entity-portal', 'entity-banking-2',
    ];
    this.EZ_QUERY_BLACKLIST = [
      'www', 'www.', 'http://www', 'https://www',
      'http://www.', 'https://www.',
    ];
    this.smartCliqzCache = smartCliqzCache;
    this.triggerUrlCache = triggerUrlCache;
  }

  // Is query valid for triggering an EZ?
  // Must have more than 2 chars and not in blacklist
  //  - avoids many unexpected EZ triggerings
  _isValidQueryForEZ(q) {
    var trimmed = q.trim();
    if (trimmed.length <= utils.MIN_QUERY_LENGHT_FOR_EZ) {
      return false;
    }

    return this.EZ_QUERY_BLACKLIST.indexOf(trimmed.toLowerCase()) == -1;
  }

  // Collect all sublinks and return a single list.
  //  - called recursively, looking for any keys that look like URLs
  _collectSublinks(data) {
    var links = [];

    for (var key in data) {
      if (typeof (data[key]) == 'object') {
        // recurse
        links = links.concat(this._collectSublinks(data[key]));
      } else if (['url', 'href'].indexOf(key) != -1) {
        links.push(data[key]);
      }
    }

    return links;
  }

  // mark entries in second that are found in first
  _getDuplicates(first, second) {
    var mixer = this;
    return second.map(function(c) {
      var duplicate = false;
      first.forEach(function(i) {
        // Does the main link match?
        if (UrlCompare.sameUrls(c.label, i.label)) {
          duplicate = true;
          return;
        }

        // Do any of the sublinks match?
        var sublinks = mixer._collectSublinks(i.data);
        sublinks.some(function(u) {
          if (UrlCompare.sameUrls(u, c.label)) {
            duplicate = true;
            return true; // stop iteration
          }
        });
      });

      if (duplicate) {
        return c;
      }
    }).filter(function(result) {
      return result;
    });
  }

  // Remove results from second list that are present in the first
  // Copy some information (such as the kind) to entry in the first list
  _deduplicateResults(first, second) {
    var duplicates = this._getDuplicates(first, second);

    // remove duplicates from second list
    second = second.filter(function(c) {
      return duplicates.indexOf(c) === -1;
    });

    // take data from duplicate second result to augment result
    // Note: this does not combine data if it is a sublink match
    first = first.map(function(r) {
      duplicates.forEach(function(dup) {
        if (UrlCompare.sameUrls(r.val, dup.val)) {
          r = Result.combine(r, dup);
        }
      });

      return r;
    });

    return { first: first, second: second };
  }

  // Special case deduplication: remove clustered links from history if already
  // somewhere else in the EZ
  _deduplicateHistory(result) {
    // Collect sublinks not in history
    var otherLinks = [];
    Object.keys(result.data).filter(function(key) {
      return key != 'urls';
    }).forEach(function(key) {
      var sublinks = this._collectSublinks(result.data[key]);
      otherLinks.concat(sublinks);
    });

    // Filter history entry, if
    result.data.urls = result.data.urls.filter(function(entry) {
      var duplicate = false;
      otherLinks.some(function(u) {
        if (UrlCompare.sameUrls(u, entry.label)) {
          duplicate = true;
          return true; // stop iteration
        }
      });

      return !duplicate;
    });
  }

  _getSmartCliqzId(smartCliqz) {
    return smartCliqz.data.subType.id;
  }
  // Find any entity zone in the results and cache them for later use.
  // Go backwards to prioritize the newest, which will be first in the list.
  _cacheEZs(extraResults) {
    if (!this.smartCliqzCache || !this.triggerUrlCache) {
      return;
    }
    var mixer = this;
    // slice creates a shallow copy, so we don't reverse existing array.
    extraResults.slice().reverse().forEach(function(r) {
      var trigger_urls = r.data.trigger_urls || [];
      var wasCacheUpdated = false;

      trigger_urls.forEach(function(url) {
        if (!mixer.triggerUrlCache.isCached(url)) {
          mixer.triggerUrlCache.store(url, true);
          wasCacheUpdated = true;
        }
      });

      if (wasCacheUpdated) {
        mixer.triggerUrlCache.save();
      }

      mixer.smartCliqzCache.store(r);
    });
  }

  // Take the first entry (if history cluster) and see if we can trigger an EZ
  // with it, this will override an EZ sent by backend.
  _historyTriggerEZ(result) {
    if (!result || !result.data ||
       !result.data.cluster || // if not history cluster
       result.data.autoAdd) { // if the base domain was auto added (guessed)
      return undefined;
    }

    if (!this.smartCliqzCache || !this.triggerUrlCache) {
      return undefined;
    }

    var url = utils.generalizeUrl(result.val, true),
      ez;

    if (this.triggerUrlCache.isCached(url)) {
      var ezId = this.triggerUrlCache.retrieve(url);
      // clear dirty data that got into the data base
      if (ezId === 'deprecated') {
        this.triggerUrlCache.delete(url);
        return undefined;
      }
      ez = this.smartCliqzCache.retrieveAndUpdate(url);
      if (ez) {
        // Cached EZ is available
        ez = Result.clone(ez);

        // copy over title and description from history entry
        if (!result.data.generic) {
          ez.data.title = result.data.title;
          if (!ez.data.description)
              ez.data.description = result.data.description;
        }

        resultKindEnricher({trigger_method: 'history_url'}, ez);
      } else {
        // Not available: start fetching now so it is available soon
        this.smartCliqzCache.fetchAndStore(url);
      }

      if (this.triggerUrlCache.isStale(url)) {
        this.triggerUrlCache.delete(url);
      }
    }

    return ez;
  }

  // Filter out any EZs that conflict with the firstresult
  _filterConflictingEZ(cliqzExtra, firstresult) {
    return cliqzExtra.filter(function(ez) {

      // Did we make a 'bet' on a url from history that does not match this EZ?
      if (firstresult.data && firstresult.data.cluster &&
         !UrlCompare.sameUrls(ez.val, firstresult.val)) {
        utils.log('Not showing EZ ' + ez.val +
                       ' because different than cluster ' + firstresult.val,
                       'Mixer');
        return false;
      }

      // Will the autocomplete change if we use this EZ?
      if (firstresult.autocompleted &&
         !UrlCompare.sameUrls(ez.val, firstresult.val)) {
        utils.log('Not showing EZ ' + ez.val +
                       ' because autocomplete would change', 'Mixer');
        return false;
      }

      return true;
    });
  }
  // Mix together history, backend and custom results. Called twice per query:
  // once with only history (instant), second with all data.
  mix(q, cliqz, history, customResults, only_history) {
    var cliqzExtra = cliqz && cliqz.length > 0 && cliqz[0].style == 'cliqz-extra' ? [cliqz.shift()] : [];
    if (!this._isValidQueryForEZ(q)) {
      cliqzExtra = [];
    } else {
      // Cache any EZs found
      this._cacheEZs(cliqzExtra);
    }

    // Prepare other incoming data
    utils.log('only_history:' + only_history +
                   ' history:' + history.length +
                   ' cliqz:' + cliqz.length +
                   ' extra:' + cliqzExtra.length, 'Mixer');

    // Were any history results also available as a cliqz result?
    //  if so, remove from backend list and combine sources in history result
    var r = this._deduplicateResults(history, cliqz);

    // Prepare results: history (first) then backend results (second)
    var results = r.first.concat(r.second);

    // Trigger EZ with first entry
    var historyEZ = this._historyTriggerEZ(results[0]);
    if (historyEZ) {
      cliqzExtra = [historyEZ];
    }

    // Filter conflicting EZs
    if (results.length > 0) {
      cliqzExtra = this._filterConflictingEZ(cliqzExtra, results[0]);
    }


    // Add custom results to the beginning if there are any
    if (customResults && customResults.length > 0) {
      cliqzExtra = customResults.concat(cliqzExtra);
    }

    // limit to one entity zone
    cliqzExtra = cliqzExtra.slice(0, 1);

    // remove any BM or simple history results covered by EZ
    r = this._deduplicateResults(cliqzExtra, results);
    results = r.second;
    var ez = r.first[0];

    // Add EZ to result list
    if (ez) {
      utils.log('EZ (' + ez.data.kind + ') for ' + ez.val, 'Mixer');

      // Make a combined entry, if possible
      if (results.length > 0 && results[0].data.cluster &&
         this.EZ_COMBINE.indexOf(ez.data.template) !== -1 &&
         UrlCompare.sameUrls(results[0].val, ez.val)) {

        utils.log('Making combined entry.', 'Mixer');
        results[0] = Result.combine(ez, result[0]);
        this._deduplicateHistory(results[0]);
      } else {
        // Add EZ to top of result list
        results = [ez].concat(results);
      }
    }

    // Special case: adjust second result if it doesn't fit
    if (utils.getPref('hist_search_type', 0) == 0 && results.length > 1 && results[1].data.template == 'pattern-h2') {
      utils.log('Converting cluster for ' + results[1].val +
                     ' to simple history', 'Mixer');

      // convert to simple history entry
      var simple = Result.generic('favicon', results[1].val, null,
                                  results[1].data.title, null, searchString);
      simple.data.kind = ['H'];
      simple.data.description = result[1].data.description;
      results[1] = simple;
    }

    // Only show a maximum 3 BM results
    var cliqzRes = 0;
    results = results.filter(function(r) {
      if (r.style.indexOf('cliqz-results ') === 0) cliqzRes++;
      return cliqzRes <= 3;
    });
    // Show no results message
    if (results.length === 0 && !only_history) {
      utils.getNoResults && results.push(utils.getNoResults());
    }

    return results;
  }
}
