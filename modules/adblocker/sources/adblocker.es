'use strict';


import { utils, events } from 'core/cliqz';
import WebRequest from 'core/webrequest';

import { URLInfo } from 'antitracking/url';
import { getGeneralDomain, sameGeneralDomain } from 'antitracking/domain';
import * as browser from 'platform/browser';

import { LazyPersistentObject } from 'antitracking/persistent-state';
import LRUCache from 'antitracking/fixed-size-cache';
import HttpRequestContext from 'antitracking/webrequest-context';

import { log } from 'adblocker/utils';
import FilterEngine, { tokenizeURL } from 'adblocker/filters-engine';
import FiltersLoader from 'adblocker/filters-loader';

import ContentPolicy from 'adblocker/content-policy';
import { hideNodes } from 'adblocker/cosmetics';
import { MutationLogger } from 'adblocker/mutation-logger';



// adb version
export const ADB_VER = 0.01;

// Preferences
export const ADB_PREF = 'cliqz-adb';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_PREF_VALUES = {
  Optimized: 2,
  Enabled:   1,
  Disabled:  0
};
export const ADB_DEFAULT_VALUE = ADB_PREF_VALUES.Disabled;


export function autoBlockAds() {
  return true;
}


export function adbEnabled() {
  // TODO: Deal with 'optimized' mode.
  // 0 = Disabled
  // 1 = Enabled
  // 2 = Optimized
  return adbABTestEnabled() && CliqzUtils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) !== 0;
}

export function adbABTestEnabled() {
  return CliqzUtils.getPref(ADB_ABTEST_PREF, false);
}


/* Wraps filter-based adblocking in a class. It has to handle both
 * the management of lists (fetching, updating) using a FiltersLoader
 * and the matching using a FilterEngine.
 */
class AdBlocker{
  constructor() {
    this.engine = new FilterEngine();

    this.listsManager = new FiltersLoader();
    this.listsManager.onUpdate(filters => {
      this.engine.onUpdateFilters(filters);
      this.initCache();
    });

    // Blacklists to disable adblocking on certain domains/urls
    this.blacklist  = new Set();
    this._blacklist = new LazyPersistentObject('adb-blacklist');

    // Is the adblocker initialized
    this._initialized = false;
  }

  initCache() {
    // To make sure we don't break any filter behavior, each key in the LRU
    // cache is made up of { source general domain } + { url }.
    // This is because some filters will behave differently based on the
    // domain of the source.

    // Cache queries to FilterEngine
    this._cache = new LRUCache(
      this.engine.match.bind(this.engine),                  // Compute result
      1000,                                                 // Maximum number of entries
      request => { return request.sourceGD + request.url; } // Select key
    );
  }

  init() {
    this.initCache();
    this.listsManager.load();
    this._blacklist.load().then(value => {
      // Set value
      if (value['urls'] !== undefined) {
        this.blacklist = new Set(value['urls']);
      }
    });
    this._initialized = true;
  }

  persistBlacklist() {
    this._blacklist.setValue({'urls': [...this.blacklist.values()]});
  }

  addToBlacklist(url) {
    this.blacklist.add(url);
    this.persistBlacklist();
  }

  removeFromBlacklist(url) {
    this.blacklist.delete(url);
    this.persistBlacklist();
  }

  isInBlacklist(request) {
    return (this.blacklist.has(request.sourceURL) ||
            this.blacklist.has(request.sourceGD));
  }

  isDomainInBlacklist(url) {
    // Should all this domain stuff be extracted into a function?
    // Why is CliqzUtils.detDetailsFromUrl not used?
    const urlParts = URLInfo.get(url);
    let hostname = urlParts.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    return this.blacklist.has(hostname);
  }

  isUrlInBlacklist(url) {
    return this.blacklist.has(url);
  }

  toggleDomain(url) {
    // Should all this domain stuff be extracted into a function?
    // Why is CliqzUtils.detDetailsFromUrl not used?
    const urlParts = URLInfo.get(url);
    let hostname = urlParts.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    this.toggleUrl(hostname);
  }

  toggleUrl(url) {
    if(this.blacklist.has(url)) {
      this.blacklist.delete(url);
    } else {
      this.blacklist.add(url);
    }

    this.persistBlacklist();
  }

  /* @param {webrequest-context} httpContext - Context of the request
   */
  match(httpContext) {
    // Check if the adblocker is initialized
    if (!this._initialized) {
      return false;
    }

    // Process endpoint URL
    const urlParts = URLInfo.get(httpContext.url);
    let hostname = urlParts.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    const hostGD = getGeneralDomain(hostname);

    // Process source url
    const source = httpContext.getSourceURL();
    const sourceParts = URLInfo.get(source);
    let sourceHostname = sourceParts.hostname;
    if (sourceHostname.startsWith('www.')) {
      sourceHostname = sourceHostname.substring(4);
    }
    const sourceGD = getGeneralDomain(sourceHostname);

    // Wrap informations needed to match the request
    const request = {
      // Request
      url: httpContext.url,
      cpt: httpContext.getContentPolicyType(),
      tokens: tokenizeURL(httpContext.url),
      // Source
      sourceURL: source,
      sourceHostname: sourceHostname,
      sourceGD: sourceGD,
      // Endpoint
      hostname: hostname,
      hostGD: hostGD,
    };

    log(`match ${JSON.stringify(request)}`);

    let t0 = Date.now();
    const isAd = this.isInBlacklist(request) ? false : this._cache.get(request);
    const totalTime = Date.now() - t0;

    log(`BLOCK AD ${JSON.stringify({
      'timeAdFilter': totalTime,
      'isAdFilter': isAd,
      'context': {
        'url': httpContext.url,
        'source': httpContext.getSourceURL(),
        'cpt': httpContext.getContentPolicyType(),
        'method': httpContext.method
      }
    })}`);

    return isAd;
  }
}

var CliqzADB = {
  adblockInitialized: false,
  adbMem: {},
  adbStats: {'pages': {}},
  mutationLogger: null,
  adbDebug: false,
  MIN_BROWSER_VERSION: 35,
  timers: [],

  init: function() {
    // Set `cliqz-adb` default to 'Disabled'
    if (CliqzUtils.getPref(ADB_PREF, undefined) === undefined) {
      CliqzUtils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
    }

    CliqzADB.adBlocker = new AdBlocker();

    const initAdBlocker = () => {
      ContentPolicy.init();
      CliqzADB.cp = ContentPolicy;
      CliqzADB.mutationLogger = new MutationLogger();
      CliqzADB.adBlocker.init();
      CliqzADB.adblockInitialized = true;
      CliqzADB.initPacemaker();
      WebRequest.onBeforeRequest.addListener(CliqzADB.httpopenObserver.observe, undefined, ['blocking']);
    };

    if (adbEnabled()) {
      initAdBlocker();
    }
    else {
      events.sub('prefchange', pref => {
        if (pref === ADB_PREF &&
            !CliqzADB.adblockInitialized &&
            adbEnabled()) {
          initAdBlocker();
        }
      });
    }
  },

  unload: function() {
    CliqzADB.unloadPacemaker();
    browser.forEachWindow(CliqzADB.unloadWindow);
    WebRequest.onBeforeRequest.removeListener(CliqzADB.httpopenObserver.observe);
  },

  initWindow: function(window) {
    if (CliqzADB.mutationLogger !== null) {
      window.gBrowser.addProgressListener(CliqzADB.mutationLogger);
    }
  },

  unloadWindow: function(window) {
    if (window.gBrowser && CliqzADB.mutationLogger !== null) {
      window.gBrowser.removeProgressListener(CliqzADB.mutationLogger);
    }
  },

  initPacemaker: function() {
    let t1 = utils.setInterval(() => {
          for (let url in CliqzADB.adbStats.pages) {
            if (!CliqzADB.isTabURL[url]) {
              delete(CliqzADB.adbStats.pages[url]);
            }
          }
        }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);

    let t2 = utils.setInterval(() =>{
      for (let t in CliqzADB.cacheADB) {
        if (!browser.isWindowActive(t)) {
          delete CliqzADB.cacheADB[t];
        }
      }
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t2);
  },

  unloadPacemaker: function() {
    CliqzADB.timers.forEach(utils.clearTimeout);
  },

  httpopenObserver: {
    observe: function(requestDetails) {
      if (!adbEnabled()) {
        return;
      }

      let requestContext = new HttpRequestContext(requestDetails),
          url = requestContext.url;

      if (!url) {
        return;
      }

      let url_parts = URLInfo.get(url);

      if (requestContext.isFullPage()) {
        CliqzADB.adbStats['pages'][url] = 0;
      }

      let source_url = requestContext.getLoadingDocument(),
          source_url_parts = null,
          source_tab = requestContext.getOriginWindowID();

      if (!source_url || source_url.startsWith('about:')) {
        return;
      }

      source_url_parts = URLInfo.get(source_url);

      // same general domain
      let same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
      if (same_gd) {
        var w_ori = requestContext.getOriginWindowID(),
            w_out = requestContext.getOuterWindowID(),
            w_in = requestContext.getInnerWindowID();
        if (w_ori!=w_out)  { // request from iframe
          var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
            .getService(Components.interfaces.nsIWindowMediator);
          var frame = wm.getOuterWindowWithId(w_out).frameElement;

          if (adbEnabled() && CliqzADB.adBlocker.match(requestContext)) {
            frame.style.display = 'none';  // hide this node
            CliqzADB.adbStats['pages'][source_url] = (CliqzADB.adbStats['pages'][source_url] || 0) + 1;

            frame.setAttribute('cliqz-adb', 'source: ' + url);
            return {cancel: true};
          }
          else {
            frame.setAttribute('cliqz-adblocker', 'safe');
          }
        }
        return;
      } else {
        if (adbEnabled()) {
          if (CliqzADB.mutationLogger.tabsInfo[source_tab] && !CliqzADB.mutationLogger.tabsInfo[source_tab].observerAdded) {
            CliqzADB.mutationLogger.addMutationObserver(source_tab);
          }
          if (CliqzADB.adBlocker.match(requestContext)) {
            hideNodes(requestContext);
            return {cancel: true};
          }
        }
      }
    }
  },
  getBrowserMajorVersion: function() {
    let appInfo = Components.classes['@mozilla.org/xre/app-info;1']
                    .getService(Components.interfaces.nsIXULAppInfo);
    return parseInt(appInfo.version.split('.')[0]);
  },
  isTabURL: function(url) {
      var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator);
      var browserEnumerator = wm.getEnumerator('navigator:browser');

      while (browserEnumerator.hasMoreElements()) {
          var browserWin = browserEnumerator.getNext();
          var tabbrowser = browserWin.gBrowser;

          var numTabs = tabbrowser.browsers.length;
          for (var index = 0; index < numTabs; index++) {
              var currentBrowser = tabbrowser.getBrowserAtIndex(index);
              if (currentBrowser) {
                  var tabURL = currentBrowser.currentURI.spec;
                  if (url == tabURL || url == tabURL.split('#')[0]) {
                      return true;
                  }
              }
          }
      }
      return false;
  },
}

export default CliqzADB
