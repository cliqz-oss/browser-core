'use strict';
/*
 * This module mixes the results from cliqz with the history
 *
 */

var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Components.utils.import('resource://gre/modules/Services.jsm');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
    'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSmartCliqzCache',
    'chrome://cliqzmodules/content/CliqzSmartCliqzCache.jsm');

CliqzUtils.init();

// enriches data kind
function kindEnricher(data, newKindParams) {
    var parts = data.kind && data.kind[0] && data.kind[0].split('|');
    if(parts.length == 2){
        try{
            var kind = JSON.parse(parts[1]);
            for(var p in newKindParams)
                kind[p] = newKindParams[p];
            data.kind[0] = parts[0] + '|' + JSON.stringify(kind);
        } catch(e){}
    }
}


var Mixer = {
    ezURLs: {},
    EZ_COMBINE: ['entity-generic', 'ez-generic-2', 'entity-search-1', 'entity-portal', 'entity-banking-2'],
    EZ_QUERY_BLACKLIST: ['www', 'www.', 'http://www', 'https://www', 'http://www.', 'https://www.'],
    TRIGGER_URLS_CACHE_FILE: 'cliqz/smartcliqz-trigger-urls-cache.json',
    init: function() {
        // TODO: get folder name from variable in CliqzSmartCliqzCache
        CliqzSmartCliqzCache.triggerUrls.load(this.TRIGGER_URLS_CACHE_FILE);

        // run every 24h at most
        var ts = CliqzUtils.getPref('smart-cliqz-last-clean-ts'),
            delay = 0;
        if (ts) {
            var lastRun = new Date(Number(ts));
            delay = Math.max(0, 86400000 - (Date.now() - lastRun));
        }
        CliqzUtils.log('scheduled SmartCliqz trigger URL cleaning in ' + (delay / 1000 / 60) + ' min');
        CliqzUtils.setTimeout(Mixer.cleanTriggerUrls, delay + 5000);

    },
    cleanTriggerUrls: function () {
        if (!CliqzSmartCliqzCache || !Mixer) {
            return;
        }

        var deleteIfWithoutTriggerUrl = function (id, cachedUrl) {
            if (!CliqzSmartCliqzCache || !Mixer) {
                return;
            }
            try {
                CliqzSmartCliqzCache._fetchSmartCliqz(id).then(function (smartCliqz) {
                    if (smartCliqz.data && smartCliqz.data.trigger_urls) {
                        var found = false;
                        for (var i = 0; i < smartCliqz.data.trigger_urls.length; i++) {
                            if (cachedUrl == smartCliqz.data.trigger_urls[i]) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            CliqzUtils.log('SmartCliqz trigger URL cache: deleting ' + cachedUrl);
                            CliqzSmartCliqzCache.triggerUrls.delete(cachedUrl);
                            CliqzSmartCliqzCache.triggerUrls.save(Mixer.TRIGGER_URLS_CACHE_FILE);
                        }
                    }
                }).catch(function (e) {
                    CliqzUtils.log('error fetching SmartCliqz: ' + e);
                });
            } catch (e) {
                CliqzUtils.log('error during cleaning trigger URLs: ' + e);
            }
        };

        CliqzUtils.log('cleaning SmartCliqz trigger URLs...');
        var delay = 1;
        for (var cachedUrl in CliqzSmartCliqzCache.triggerUrls._cache) {
            var id = CliqzSmartCliqzCache.triggerUrls.retrieve(cachedUrl);
            if (id) {
                CliqzUtils.setTimeout(deleteIfWithoutTriggerUrl, (delay++) * 1000, id, cachedUrl);
            }
        }
        CliqzUtils.setTimeout(function () {
            CliqzUtils.log('done cleaning SmartCliqz trigger URLs');
            CliqzUtils.setPref('smart-cliqz-last-clean-ts', Date.now().toString());
            CliqzUtils.setTimeout(Mixer.cleanTriggerUrls, 86400000); // next cleaning in 24h
        }, delay * 1000);
    },
	mix: function(q, cliqz, cliqzExtra, instant, customResults, only_instant, instant_autocomplete){
		var results = [];

        if(!instant)
            instant = [];
        if(!cliqz)
            cliqz = [];
        if(!cliqzExtra)
            cliqzExtra = [];

        // CliqzUtils.log("cliqz: " + JSON.stringify(cliqz), "Mixer");
        // CliqzUtils.log("instant: " + JSON.stringify(instant), "Mixer");
        // CliqzUtils.log("extra:   " + JSON.stringify(cliqzExtra), "Mixer");
        CliqzUtils.log("only_instant:" + only_instant + " autocomplete:" + instant_autocomplete + " instant:" + instant.length + " cliqz:" + cliqz.length + " extra:" + cliqzExtra.length, "Mixer");

        // set trigger method for EZs returned from RH
        for(var i=0; i < (cliqzExtra || []).length; i++) {
            kindEnricher(cliqzExtra[i].data, { 'trigger_method': 'rh_query' });
        }

        // annotate with original backend result index
        for (var i = 0; i < cliqz.length; i++) {
            var subType = (cliqz[i].subType && JSON.parse(cliqz[i].subType)) || { };
            cliqz[i].subType = JSON.stringify((subType.i = i, subType));
        }

        // extract the entity zone accompanying the first cliqz result, if any
        if(cliqz && cliqz.length > 0) {
            if(cliqz[0].extra) {
                // only if query has more than 2 chars and not in blacklist
                //  - avoids many unexpected EZ triggerings
                if(q.length > 2 && (Mixer.EZ_QUERY_BLACKLIST.indexOf(q.toLowerCase().trim()) == -1)) {
                    var extra = Result.cliqzExtra(cliqz[0].extra, cliqz[0].snippet);
                    kindEnricher(extra.data, { 'trigger_method': 'backend_url' });
                    cliqzExtra.push(extra);
                } else {
                    CliqzUtils.log("Suppressing EZ " + cliqz[0].extra.url + " because of ambiguious query " + q, "Mixer");
                }
            }
        }

        // Record all titles and descriptions found in cliqz results.
        // To be used later when displaying history entries.
        var title_desc = {};
        for(var i=0; i<cliqz.length; i++){
            if(cliqz[i].snippet) {
                title_desc[cliqz[i].url] = {};
                if(cliqz[i].snippet.desc)
                    title_desc[cliqz[i].url].desc = cliqz[i].snippet.desc;
                if(cliqz[i].snippet.title)
                    title_desc[cliqz[i].url].title = cliqz[i].snippet.title;
            }
        }
        CliqzUtils.setTimeout(CliqzHistory.updateTitlesDescriptions, 25, title_desc);

        // Was instant history result also available as a cliqz result?
        //  if so, remove from backend list and combine sources in instant result
        var cliqz_new = [],
            instant_new = [],
            j;
        for (j = 0; j < instant.length; j++) {
            // clone all instant entries so they can be modified for this mix only
            instant_new[j] = Result.clone(instant[j]);
        }
        instant = instant_new;
        for(var i=0; i < cliqz.length; i++) {
            var cl_url = CliqzHistoryPattern.generalizeUrl(cliqz[i].url, true);
            var duplicate = false;

            for (var j = 0; j < instant.length; j++) {
                // Does the main link match?
                var instant_url = CliqzHistoryPattern.generalizeUrl(instant[j].label, true);
                if(cl_url == instant_url) {
                    instant[j] = Result.combine(instant[j], Result.cliqz(cliqz[i]));
                    duplicate = true;
                }

                // Do any of the sublinks match?
                if(instant[j].style == 'cliqz-pattern') {
                    for(var u in instant[j].data.urls) {
                        var instant_url = CliqzHistoryPattern.generalizeUrl(instant[j].data.urls[u].href);
                        if (instant_url == cl_url) {
                            // combinding sources for clustered results
                            var tmpResult = Result.cliqz(cliqz[i]);
                            instant[j].data.urls[u].kind =
                                (instant[j].data.urls[u].kind || []).concat(tmpResult.data.kind || []);
                            duplicate = true;
                            break;
                        }
                    }
                }
            }
            if (!duplicate) {
                cliqz_new.push(cliqz[i]);
            }
        }

        cliqz = cliqz_new;

        var results = instant;

        for(let i = 0; i < cliqz.length; i++) {
            results.push(Result.cliqz(cliqz[i]));
        }

        // Find any entity zone in the results and cache them for later use
        // go backwards to be sure to cache the newest (which will be first in the list)
        for(var i=(cliqzExtra || []).length - 1; i >= 0; i--){
            var r = cliqzExtra[i];
            if(r.style == 'cliqz-extra'){
                if(r.val != "" && r.data.subType){
                    var eztype = JSON.parse(r.data.subType).ez;
                    var trigger_urls = r.data.trigger_urls || [];
                    if(eztype && trigger_urls.length > 0) {
                        var wasCacheUpdated = false;
                        for(var j=0; j < trigger_urls.length; j++) {
                            if(CliqzSmartCliqzCache.triggerUrls.retrieve(trigger_urls[j]) != eztype) {
                                CliqzSmartCliqzCache.triggerUrls.store(trigger_urls[j], eztype);
                                wasCacheUpdated = true;
                            }
                        }
                        if (wasCacheUpdated) {
                            CliqzSmartCliqzCache.triggerUrls.save(Mixer.TRIGGER_URLS_CACHE_FILE);
                        }
                        CliqzSmartCliqzCache.store(r);
                    }
                }
            }
        }

        // Take the first entry (if history cluster) and see if we can trigger an EZ with it,
        // this will override an EZ sent by backend.
        if(results.length > 0 && results[0].data &&
           results[0].data.cluster && // if history cluster
           !results[0].data.autoAdd // but not when the base domain has been auto added (guessed)
           ) {
            var url = results[0].val;

            url = CliqzHistoryPattern.generalizeUrl(url, true);
            if (CliqzSmartCliqzCache.triggerUrls.isCached(url)) {
                var ezId = CliqzSmartCliqzCache.triggerUrls.retrieve(url);
                var ez = CliqzSmartCliqzCache.retrieve(ezId);
                if(ez) {
                    ez = Result.clone(ez);

                    // copy over title and description from history entry
                    if(!results[0].data.generic) {
                        ez.data.title = results[0].data.title;
                        if(!ez.data.description)
                            ez.data.description = results[0].data.description;
                    }

                    kindEnricher(ez.data, { 'trigger_method': 'history_url' });
                    cliqzExtra = [ez];
                } else {
                    // start fetching now
                    CliqzSmartCliqzCache.fetchAndStore(ezId);
                }
                if (CliqzSmartCliqzCache.triggerUrls.isStale(url)) {
                    CliqzSmartCliqzCache.triggerUrls.delete(url);
                }
            }
        }

// NOTE: Simple deduplication is done above, which is much less aggressive than the following function.
// Consider taking some ideas from this function but not all.
        results = Filter.deduplicate(results, -1, 1, 1);

        // limit to one entity zone
        cliqzExtra = cliqzExtra.slice(0, 1);

        // add extra (fun search) results at the beginning if a history cluster is not already there
        if(CliqzUtils.getPref("alternative_ez", "") != "none" && cliqzExtra && cliqzExtra.length > 0) {

            // Did we already make a 'bet' on a url from history that does not match this EZ?
            if(results.length > 0 && results[0].data && results[0].data.cluster &&
               CliqzHistoryPattern.generalizeUrl(results[0].val, true) != CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true)) {
                // do not show the EZ because the local bet is different than EZ
                CliqzUtils.log("Not showing EZ " + cliqzExtra[0].val + " because different than cluster " + results[0].val , "Mixer");

            } else if(results.length > 0 && !only_instant && instant_autocomplete &&
               CliqzHistoryPattern.generalizeUrl(results[0].val, true) != CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true)) {
                // do not show the EZ because the autocomplete will change
                CliqzUtils.log("Not showing EZ " + cliqzExtra[0].val + " because autocomplete would change", "Mixer");

            } else {
                CliqzUtils.log("EZ (" + cliqzExtra[0].data.kind + ") for " + cliqzExtra[0].val, "Mixer");

                // Remove entity links from history cluster
                if(results.length > 0 && results[0].data.template && results[0].data.template.indexOf("pattern") == 0) {
                    var mainUrl = cliqzExtra[0].val;
                    var history = results[0].data.urls;
                    CliqzHistoryPattern.removeUrlFromResult(history, mainUrl);
                    // Go through entity data and search for urls
                    for(var k in cliqzExtra[0].data) {
                        for(var l in cliqzExtra[0].data[k]) {
                            if(cliqzExtra[0].data[k][l].url) {
                                CliqzHistoryPattern.removeUrlFromResult(history, cliqzExtra[0].data[k][l].url);
                            }
                        }
                    }
                    // Change size or remove history if necessary
                    if(history.length == 0) {
                        CliqzUtils.log("No history left after deduplicating with EZ links.")
                        results.splice(0,1);
                    }
                    else if(history.length == 2) results[0].data.template = "pattern-h3";
                }

                // remove any BM or simple history results covered by EZ
                var results_new = [];
                for(let i=0; i < results.length; i++) {
                    if(results[i].style.indexOf("cliqz-pattern") == 0)
                        results_new.push(results[i]);
                    else {
                        var matchedEZ = false;

                        // Check if the main link matches
                        if(CliqzHistoryPattern.generalizeUrl(results[i].val) ==
                           CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val)) {
                            cliqzExtra[0] = Result.combine(cliqzExtra[0], results[i]);

                            matchedEZ = true;
                        }

                        // Look for sublinks that match
                        for(k in cliqzExtra[0].data) {
                            for(l in cliqzExtra[0].data[k]) {
                                if(cliqzExtra[0].data[k][l] && CliqzHistoryPattern.generalizeUrl(results[i].val) ==
                                   CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].data[k][l].url))
                                    matchedEZ = true;
                            }
                        }
                        if(!matchedEZ)
                            results_new.push(results[i]);
                    }
                }
                results = results_new;

                // if the first result is a history cluster and
                // there is an EZ of a supported types then make a combined entry
                if(results.length > 0 && results[0].data && results[0].data.cluster &&
                   Mixer.EZ_COMBINE.indexOf(cliqzExtra[0].data.template) != -1 &&
                   CliqzHistoryPattern.generalizeUrl(results[0].val, true) == CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true) ) {

                    var temp_history = results[0];
                    var old_kind = temp_history.data.kind;
                    results[0] = cliqzExtra[0];
                    results[0].data.kind = (results[0].data.kind || []).concat(old_kind || []);
                    results[0].data.urls = (temp_history.data.urls || []).slice(0,3);
                }
                // Convert 2/3 size history into 1/3 to place below EZ
                else if(results.length > 0 &&
                        results[0].data && results[0].data.template == "pattern-h2" &&
                        CliqzUtils.TEMPLATES[cliqzExtra[0].data.template] == 2) {
                    results[0].data.template = "pattern-h3";
                    // limit number of URLs
                    results[0].data.urls = (results[0].data.urls || []).slice(0,3);
                    results = cliqzExtra.concat(results);
                } else {
                    results = cliqzExtra.concat(results);
                }
            }
        }


        // Change history cluster size if there are less than three links and it is h2
        /*if(results.length > 0 && results[0].data.template == "pattern-h2" && results[0].data.urls.length < 3) {
          results[0].data.template = "pattern-h3-cluster";
        }*/

        // Modify EZ template - for test
        if(CliqzUtils.getPref("alternative_ez", "") == "description") {

            for(var i=0; i<results.length; i++) {
                if(results[i].data && results[i].data.template == "entity-generic")
                    results[i].data.template = "ez-generic-2"
            }
        }

        // Add custom results to the beginning if there are any
        if(customResults && customResults.length > 0) {
            results = customResults.concat(results);
        }

        //allow maximum 3 BM results
        var cliqzRes = 0;
        results = results.filter(function(r){
            if(r.style.indexOf('cliqz-results ') == 0) cliqzRes++;
            return cliqzRes <= 3;
        })

        // ----------- noResult EntityZone---------------- //
        if(results.length == 0 && !only_instant){
            results.push(CliqzUtils.getNoResults());
        }

        return results;
    }
}

Mixer.init();
