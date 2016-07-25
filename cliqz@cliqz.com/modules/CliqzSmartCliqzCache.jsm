'use strict';

/*
 * This module caches SmartCliqz results in the extension. It
 * also customizes news SmartCliqz and a set of selected domains
 * by re-ordering categories and links based on the user's browsing
 * history.
 *
 * author: Dominik Schmidt (cliqz)
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzSmartCliqzCache'];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// not available in older FF versions
try {
	Cu.import("resource://gre/modules/osfile.jsm");
} catch(e) { }

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

// this simple cache is a dictionary that addionally stores 
// timestamps for each entry; life is time in seconds before 
// entries are marked stale (if life is not specified entries 
// are good forever); going stale has no immediate consequences
var Cache = function (life) {
	this._cache = { };
	this._life = life ? life * 1000 : false;
};

// stores entry only if it is newer than current entry,
// current time is used if time is not specified 
Cache.prototype.store = function (key, value, time) {
	time = time || Date.now();

	if (this.isNew(key, value, time)) {
		this._cache[key] = {
			time: time,
			value: value
		};
	}
};

// deletes entry
Cache.prototype.delete = function (key) {
	if (this.isCached(key)) {
		delete this._cache[key];
	}
};

// returns cached entry or false if no entry exists for key
Cache.prototype.retrieve = function (key) {
	if (!this.isCached(key)) {
		return false;
	}
	return this._cache[key].value;
};

Cache.prototype.isCached = function (key) {
	return this._cache.hasOwnProperty(key);
};

// returns true if there is no newer entry already cached for key
Cache.prototype.isNew = function (key, value, time) {
	return !this.isCached(key) || 
		(time > this._cache[key].time);
};

// an entry is stale if it is not cached or has expired
// (an entry can only expire if life is specified); this
// has no immediate consequences, but can be used from
// outside to decide if this entry should be updated
Cache.prototype.isStale = function (key) {
	return !this.isCached(key) ||
		(this._life && (Date.now() - this._cache[key].time) > this._life);
};

// updates time without replacing the entry
Cache.prototype.refresh = function (key, time) {
	time = time || Date.now();

	if (this.isCached(key)) {
		this._cache[key].time = time;
	}
};

// save cache to file
Cache.prototype.save = function (filename) {
	try {
		var data = (new TextEncoder()).encode(
			JSON.stringify(this._cache));
		var path = OS.Path.join(
			OS.Constants.Path.profileDir, filename);
		var _this = this;

		OS.File.writeAtomic(path, data).then(
			function(value) {
    			_this._log("save: saved to " + path);
			}, function(e) {
				_this._log("save: failed saving to " + path + 
					": " + e);
			});
	} catch (e) {
		this._log("save: failed saving: " + e);
	}	
};

// load cache from file
Cache.prototype.load = function (filename) {
	try {
		var _this = this;
		var path = OS.Path.join(
			OS.Constants.Path.profileDir, filename);

		OS.File.read(path).then(function(data) {
			_this._cache = JSON.parse((new TextDecoder()).decode(data));
			_this._log("load: loaded from: " + path);
		}).catch(function(e) {
			_this._log("load: failed loading: " + e);
		});
	} catch (e) {
		this._log("load: failed loading: " + e);
	}
};

Cache.prototype._log = function (msg) {
	CliqzUtils.log(msg, 'Cache');	
};

var CliqzSmartCliqzCache = CliqzSmartCliqzCache || {
	SMART_CLIQZ_ENDPOINT: 'http://newbeta.cliqz.com/api/v1/rich-header?path=/id_to_snippet&q=',
	// TODO: move to external file
	// TODO: allow for fetching related history URLs from different domains (e.g., chefkoch.de)
	URL_PREPARSING_RULES: {
		"amazon.de":     /(node=\d+)/,									// node id
		"otto.de":       /otto.de\/([\w|-]{3,})/,						// first part of URL
		"zalando.de":    /zalando.de\/([\w|-]{3,})/,					// first part of URL
		"skygo.sky.de":  /sky.de\/([\w|-]{3,})/,						// first part of URL
		"strato.de":     /strato.de\/([\w|-]{3,})/,			 			// first part of URL
		"bonprix.de":    /bonprix.de\/kategorie\/([\w|-]{3,})/,			// first part of URL after "kategorie"
		"expedia.de": 	 /(?:expedia.de\/([\w|-]{3,})|([\w|-]{4,})\.expedia.de)/,
																		// first part of URL or subdomain
		"linguee.de": 	 /linguee.de\/[\?]?([\w|-]{3,})/,				// first part of URL, also allowing for parameters
		"tvspielfilm.de":/tvspielfilm.de\/(?:tv-programm\/)?(?:sendungen\/)?([\w|-]{3,})/,
																		// first part of URL, ignoring some paths
		"kino.de": 		 /kino.de\/(?:filme|trailer)?\/?([\w|-]{3,})/,  // first part of URL, ignoring some paths
		"ricardo.ch": 	 /(\w{4,})?\.?ricardo.ch\/(?:kaufen)?\/?([\w|-]{3,})?/,
																		// first part of URL, ignoring some paths, or subdomain
		"kabeldeutschland.de":
						/kabeldeutschland.de\/(?:csc\/produkte\/)?([\w|-]{3,})/,
																		// first part of URL, ignoring some paths
		"tchibo.de":  	/(\w{4,})?\.?tchibo.de\/([\w|-]{3,})?/,			// first part of URL or subdomain
		"holidaycheck.de":
						/holidaycheck.de\/([\w|-]{3,})/,				// first part of URL
		"chefkoch.de": 	/chefkoch\-?(blog)?.de\/([\w|-]{3,})?/,			// first part of URL or blog (FIXME: won't get fetched from history since different domain)
		"1und1.de": 	/(?:hosting\.)?(\w{4,})?\.?1und1.de\/([\w|-]{3,})?/,
																		// first part of URL or subdomain (ignoring some)
		"immowelt.de": 	/immowelt.de\/(?:immobilien|wohnen)?\/?([\w|-]{3,})?/,
																		// first part of URL, ignoring some paths
		"mediamarkt.de":/mediamarkt.de\/mcs\/productlist\/([\w|-]{3,})?/,
																		// product list name
		"saturn.de":  	/saturn.de\/mcs\/productlist\/([\w|-]{3,})?/	// product list name
		// "zdf.de": 		/(\w{4,})?\.de/,							// won't work since all links are from different domains

	},
	CUSTOM_DATA_CACHE_FOLDER: 'cliqz',
	CUSTOM_DATA_CACHE_FILE: 'smartcliqz-custom-data-cache.json',
	// maximum number of items (e.g., categories or links) to keep
	MAX_ITEMS: 5,

	_smartCliqzCache: new Cache(),
	_customDataCache: new Cache(3600), // re-customize after an hour
	_isCustomizationEnabledByDefault: true,
	_isInitialized: false,

	// to prevent fetching while fetching is still in progress
	_fetchLock: { },

	// TODO: clean-up
	triggerUrls: new Cache(), 

	// loads cache content from persistent storage
	init: function () {
		// create folder underneath profile folder to store persistent cache
		try {
			var folderPath = OS.Path.join(
				OS.Constants.Path.profileDir, this.CUSTOM_DATA_CACHE_FOLDER);
			OS.File.makeDir(folderPath, { ignoreExisting: true });

			// TODO: detect when loaded; allow save only afterwards
			var filePath = OS.Path.join(folderPath, this.CUSTOM_DATA_CACHE_FILE);
			this._customDataCache.load(filePath);
		} catch (e) {
			this._log('init: unable to create cache folder:' + e);
		}
		
		this._isInitialized = true;
		this._log('init: initialized');
	},

	// stores SmartCliqz if newer than chached version
	store: function (smartCliqz) {
		var id = this.getId(smartCliqz);

		this._smartCliqzCache.store(id, smartCliqz, 
			this.getTimestamp(smartCliqz));

		try {
			if (this.isCustomizationEnabled() && 
				(this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz)) && 
				this._customDataCache.isStale(id)) {				

				this._log('store: found stale data for id ' + id);
				this._prepareCustomData(id);
			}
		} catch (e) {
			this._log('store: error while customizing data: ' + e);
		}
	},

	fetchAndStore: function (id) {
		if (this._fetchLock.hasOwnProperty(id)) {
			this._log('fetchAndStore: fetching already in progress for id ' + id);
			return;
		}

		this._log('fetchAndStore: for id ' + id);		
		this._fetchLock[id] = true;
		var _this = this;
		this._fetchSmartCliqz(id).then(function (smartCliqz) {			
			// limit number of categories/links
			if (smartCliqz.hasOwnProperty('data')) {
				if (smartCliqz.data.hasOwnProperty('links')) {
					smartCliqz.data.links = smartCliqz.data.links.slice(0, _this.MAX_ITEMS);
				}
				if (smartCliqz.data.hasOwnProperty('categories')) {
					smartCliqz.data.categories = smartCliqz.data.categories.slice(0, _this.MAX_ITEMS);
				}
			}
			_this.store(smartCliqz);
			delete _this._fetchLock[id];
		}, function (reason) {
			_this._log('fetchAndStore: error while fetching data: ' + reason);
			delete _this._fetchLock[id];
		});
	},

	// returns SmartCliqz from cache (false if not found);
	// customizes SmartCliqz if news or domain supported, and user preference is set
	retrieve: function (id) {
		var smartCliqz = this._smartCliqzCache.retrieve(id);

		if (this.isCustomizationEnabled() && smartCliqz && 
			(this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz))) {
			try {	
				this._customizeSmartCliqz(smartCliqz);
			} catch (e) {
				this._log('retrieveCustomized: error while customizing data: ' + e);
			}
		}
		return smartCliqz;
	},

	// extracts domain from SmartCliqz
	getDomain: function (smartCliqz) {
		// TODO: define one place to store domain
		if (smartCliqz.data.domain) {
			return smartCliqz.data.domain;
		} else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
			return CliqzHistoryPattern.generalizeUrl(smartCliqz.data.trigger_urls[0]);
		} else {
			return false;
		}
	},

	// extracts id from SmartCliqz
	getId: function (smartCliqz) {
		return JSON.parse(smartCliqz.data.subType).ez;
	},

	// extracts timestamp from SmartCliqz
	getTimestamp: function (smartCliqz) {
		return smartCliqz.data.ts;
	},

	// returns true this is a news SmartCliqz
	isNews: function (smartCliqz) {
		return (typeof smartCliqz.data.news != 'undefined');
	},

	// returns true if there are pre-parsing rules available for the SmartCliqz's domain
	isDomainSupported: function (smartCliqz) {
		return this.URL_PREPARSING_RULES.hasOwnProperty(this.getDomain(smartCliqz));
	},

	// returns true if the user enabled customization
	isCustomizationEnabled: function() {
		try {
            var isEnabled =
            	CliqzUtils.getPref("enableSmartCliqzCustomization", undefined);
            
            return isEnabled === undefined ? 
            	this._isCustomizationEnabledByDefault : isEnabled;
        } catch(e) {        	
            return this._isCustomizationEnabledByDefault;
        }
	},

	// re-orders categories based on visit frequency
	_customizeSmartCliqz: function (smartCliqz) {		
		var id = this.getId(smartCliqz);
		
		if (this._customDataCache.isCached(id)) {
			this._injectCustomData(smartCliqz, 
				this._customDataCache.retrieve(id));

			if (this._customDataCache.isStale(id)) {
				this._log(
					'_customizeSmartCliqz: found stale data for ' + id);
				this._prepareCustomData(id);
			}
		} else {
			this._log(
				'_customizeSmartCliqz: custom data not yet ready for ' + id);
		}
	},
	// replaces all keys from custom data in SmartCliqz data
	_injectCustomData: function (smartCliqz, customData) {
		var id = this.getId(smartCliqz);
		this._log('_injectCustomData: injecting for id ' + id);
		for (var key in customData) {
			if (customData.hasOwnProperty(key)) {				
				smartCliqz.data[key] = customData[key];
				this._log('_injectCustomData: injecting key ' + key);
			}
		}
		this._log('_injectCustomData: done injecting for id ' + id);
	},
	// prepares and stores custom data for SmartCliqz with given id (async.),
	// (if custom data has not been prepared before and has not expired)
	_prepareCustomData: function (id) {
		if (this._customDataCache.isStale(id)) {
			// update time so that this method is not executed multiple
			// times while not yet finished (runs asynchronously)
			this._customDataCache.refresh(id);
			this._log('_prepareCustomData: preparing for id ' + id);
		} else {
			this._log('_prepareCustomData: already updated or in update progress ' + id);
			return;
		}

		// FIXME: if any of the following steps fail, stale custom data
		//        will linger around; possible fix: if it fails, delete
		//		  custom data from cache

		// for stats
		var oldCustomData = this._customDataCache.retrieve(id);	

		// (1) fetch template from rich header
		var _this = this;
		this._fetchSmartCliqz(id).then(function (smartCliqz) {
			var id = _this.getId(smartCliqz);
			var domain = _this.getDomain(smartCliqz);

			// (2) fetch history for SmartCliqz domain
			_this._fetchVisitedUrls(domain, function callback(urls) {

				// (3) re-order template categories based on history
				
				// TODO: define per SmartCliqz what the data field to be customized is called
				if (!_this.isNews(smartCliqz)) {
					smartCliqz.data.categories = smartCliqz.data.links;
				}

				var categories = smartCliqz.data.categories.slice();

				// add some information to facilitate re-ordering
				for (var j = 0; j < categories.length; j++) {
					categories[j].genUrl =
						_this._preparseUrl(categories[j].url, domain);
					categories[j].matchCount = 0;
					categories[j].originalOrder = j;
				}

				// count category-visit matches (visit url contains category url)
				for (var i = 0; i < urls.length; i++) {
					var url = 
						_this._preparseUrl(urls[i], domain);
					for (var j = 0; j < categories.length; j++) {
						if (_this._isMatch(url, categories[j].genUrl)) {
		                    categories[j].matchCount++;
		                }
					}
				}

				// re-order by match count; on tie use original order
				categories.sort(function compare(a, b) {
                    if (a.matchCount != b.matchCount) {                        
                        return b.matchCount - a.matchCount; // descending
                    } else {                        
                        return a.originalOrder - b.originalOrder; // ascending
                    }
                });

                categories = categories.slice(0, _this.MAX_ITEMS);

                var oldCategories = oldCustomData ?
                	// previous customization: use either categories (news) or links (other SmartCliqz)
                	(_this.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links) : 
                	// no previous customization: use default order
                	smartCliqz.data.categories;

                // send some stats
                _this._sendStats(id, oldCategories,
                	categories, oldCustomData ? true : false, urls);

                // TODO: define per SmartCliqz what the data field to be customized is called
                if (_this.isNews(smartCliqz)) {
                	_this._customDataCache.store(id, { categories: categories });
                } else {
                	_this._customDataCache.store(id, { links: categories });
                }

                _this._log('_prepareCustomData: done preparing for id ' + id);
                _this._customDataCache.save(_this.CUSTOM_DATA_CACHE_FILE);
			})
		});
	},
	// extracts relevant information to base matching on
	_preparseUrl: function (url, domain) {
		url = CliqzHistoryPattern.generalizeUrl(url);

		// domain-specific preparations
		if (domain) {
			var rule = this.URL_PREPARSING_RULES[domain];
			if (rule) {
				var match = rule.exec(url);
				if (match) {
					// this._log('_preparseUrl: match "' + match[1] + '" for url ' + url);
					// find first match
					for (var i = 1; i < match.length; i++) {
						if (match[i]) {
							url = match[i];
							break;
						}
					}
				} else {
					// leave URL untouched
					// this._log('_preparseUrl: no match for url ' + url);
				}
			} else {
				// no rule found (e.g., for news domains)
				// this._log('_preparseUrl: no rule found for domain ' + domain);
			}			
		}

		return url;
	},
	// checks if URL from history matches a category URL
	_isMatch: function (historyUrl, categoryUrl) {
		// TODO: check for subcategories, for example,
		//       Spiegel "Soziales" has URL "wirtschaft/soziales",
		//		 thus such entries are counted twice, for "Sozialez",
		//		 but also for "Wirtschaft"
		return historyUrl.indexOf(categoryUrl) > -1;
	},
	// fetches SmartCliqz from rich-header's id_to_snippet API (async.)
	_fetchSmartCliqz: function (id, callback) {
		this._log('_fetchSmartCliqz: start fetching for id ' + id);
		var _this = this;
		
		var promise = new Promise(function (resolve, reject) {
			var endpointUrl = _this.SMART_CLIQZ_ENDPOINT + id;
			
			CliqzUtils.httpGet(endpointUrl, function success(req) {
        		try {
	        		var smartCliqz = 
	        			JSON.parse(req.response).extra.results[0];
	        		smartCliqz = Result.cliqzExtra(smartCliqz);	        		
	        		_this._log('_fetchSmartCliqz: done fetching for id ' + id);
        			resolve(smartCliqz);
        		} catch (e) {
        			_this._log('_fetchSmartCliqz: error fetching for id ' + id + ': ' + e);
        			reject(e);
        		}
        	}, function onerror() {
        		reject('http request failed for id ' + id);
        	});
		});
		return promise;
	},
	// from history, fetches all visits to given domain within 30 days from now (async.)
	_fetchVisitedUrls: function (domain, callback) {
		this._log('_fetchVisitedUrls: start fetching for domain ' + domain);

		var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        if (!historyService) {
        	this._log('_fetchVisitedUrls: history service not available');
        	return;
        }

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        // 30 days from now
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        var _this = this;
        CliqzUtils.setTimeout(function fetch() {
        	var result = 
        		historyService.executeQuery(query, options);

	        var container = result.root;
	        container.containerOpen = true;

	        var urls = [];
	        for (var i = 0; i < container.childCount; i ++) {
	             urls[i] = container.getChild(i).uri;
	        }

	        _this._log(
	        		'_fetchVisitedUrls: done fetching ' +  urls.length + 
	        		' URLs for domain ' + domain);
	        callback(urls);
        }, 0);
	},
	_sendStats: function (id, oldCategories, newCategories, isRepeatedCustomization, urls) {
		var stats = {
			type: 'activity',
			action: 'smart_cliqz_customization',
			// SmartCliqz id
			id: id,
			// total number of URLs retrieved from history
			urlCandidateCount: urls.length,
			// number of URLs that produced a match within shown categories (currently 5)
			urlMatchCount: 0,
			// average number of URL matches across shown categories
			urlMatchCountAvg: 0,
			// standard deviation of URL matches across shown categories
			urlMatchCountSd: 0,
			// number of categories that changed (per position; swap counts twice)
			categoriesPosChangeCount: 0,
			// number of categories kept after re-ordering (positions might change)
			categoriesKeptCount: 0,
			// average position change of a kept categories
			categoriesKeptPosChangeAvg: 0,
			// true, if this customization is a re-customization
			isRepeatedCustomization: isRepeatedCustomization
		};

		var oldPositions = { };
		var length = Math.min(oldCategories.length, newCategories.length);

    	for (var i = 0; i < length; i++) {
    		stats.urlMatchCount += newCategories[i].matchCount;
    		oldPositions[oldCategories[i].title] = i;

    		if (newCategories[i].title != oldCategories[i].title) {
    			stats.categoriesPosChangeCount++;
    		}
    	}
    	stats.urlMatchCountAvg = stats.urlMatchCount / length;

    	for (var i = 0; i < length; i++) {
    		stats.urlMatchCountSd += 
    			Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
    	}
    	stats.urlMatchCountSd /= length;
    	stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

    	for (var i = 0; i < length; i++) { 
    		if (oldPositions.hasOwnProperty(newCategories[i].title)) {
    			stats.categoriesKeptCount++;
    			stats.categoriesKeptPosChangeAvg += 
    				Math.abs(i - oldPositions[newCategories[i].title]);
    			
    		}
    	}
    	stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

    	CliqzUtils.telemetry(stats);
	},
	// log helper
	_log: function (msg) {
		CliqzUtils.log(msg, 'SmartCliqzCache');
	}
}

CliqzSmartCliqzCache.init();