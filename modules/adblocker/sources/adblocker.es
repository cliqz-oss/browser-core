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

import CliqzHumanWeb from 'human-web/human-web';


// adb version
export const ADB_VER = 0.01;

// Preferences
export const ADB_PREF = 'cliqz-adb';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_PREF_VALUES = {
  Optimized: 2,
  Enabled: 1,
  Disabled: 0,
};
export const ADB_DEFAULT_VALUE = ADB_PREF_VALUES.Disabled;


export function autoBlockAds() {
  return true;
}


export function adbABTestEnabled() {
  return CliqzUtils.getPref(ADB_ABTEST_PREF, false);
}


export function adbEnabled() {
  // TODO: Deal with 'optimized' mode.
  // 0 = Disabled
  // 1 = Enabled
  // 2 = Optimized
  return adbABTestEnabled() && CliqzUtils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) !== 0;
}


/* Wraps filter-based adblocking in a class. It has to handle both
 * the management of lists (fetching, updating) using a FiltersLoader
 * and the matching using a FilterEngine.
 */
class AdBlocker {
  constructor() {
    this.engine = new FilterEngine();

    this.listsManager = new FiltersLoader();
    this.listsManager.onUpdate(filters => {
      this.engine.onUpdateFilters(filters);
      this.initCache();
    });

    // Blacklists to disable adblocking on certain domains/urls
    this.blacklist = new Set();
    this.blacklistPersist = new LazyPersistentObject('adb-blacklist');

    // Is the adblocker initialized
    this.initialized = false;
  }

  initCache() {
    // To make sure we don't break any filter behavior, each key in the LRU
    // cache is made up of { source general domain } + { url }.
    // This is because some filters will behave differently based on the
    // domain of the source.

    // Cache queries to FilterEngine
    this.cache = new LRUCache(
      this.engine.match.bind(this.engine),      // Compute result
      1000,                                     // Maximum number of entries
      request => request.sourceGD + request.url // Select key
    );
  }

  init() {
    this.initCache();
    this.listsManager.load();
    this.blacklistPersist.load().then(value => {
      // Set value
      if (value.urls !== undefined) {
        this.blacklist = new Set(value.urls);
      }
    });
    this.initialized = true;
  }

  persistBlacklist() {
    this.blacklistPersist.setValue({ urls: [...this.blacklist.values()] });
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

  logActionHW(url, action, domain) {
    let type = 'url';
    if (domain) {
      type = 'domain';
    }
    if (!CliqzHumanWeb.state.v[url].adblocker_blacklist) {
      CliqzHumanWeb.state.v[url].adblocker_blacklist = {};
    }
    CliqzHumanWeb.state.v[url].adblocker_blacklist[action] = type;
  }

  toggleUrl(url, domain) {
    let processedURL = url;
    if (domain) {
      // Should all this domain stuff be extracted into a function?
      // Why is CliqzUtils.getDetailsFromUrl not used?
      processedURL = URLInfo.get(url).hostname;
      if (processedURL.startsWith('www.')) {
        processedURL = processedURL.substring(4);
      }
    }

    const existHW = CliqzHumanWeb && CliqzHumanWeb.state.v[url];
    if (this.blacklist.has(processedURL)) {
      this.blacklist.delete(processedURL);
      // TODO: It's better to have an API from humanweb to indicate if a url is private
      if (existHW) {
        this.logActionHW(url, 'remove', domain);
      }
    } else {
      this.blacklist.add(processedURL);
      if (existHW) {
        this.logActionHW(url, 'add', domain);
      }
    }

    this.persistBlacklist();
  }

  /* @param {webrequest-context} httpContext - Context of the request
   */
  match(httpContext) {
    // Check if the adblocker is initialized
    if (!this.initialized) {
      return false;
    }

    // Process endpoint URL
    const url = httpContext.url.toLowerCase();
    const urlParts = URLInfo.get(url);
    let hostname = urlParts.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    const hostGD = getGeneralDomain(hostname);

    // Process source url
    const source = httpContext.getSourceURL().toLowerCase();
    const sourceParts = URLInfo.get(source);
    let sourceHostname = sourceParts.hostname;
    if (sourceHostname.startsWith('www.')) {
      sourceHostname = sourceHostname.substring(4);
    }
    const sourceGD = getGeneralDomain(sourceHostname);

    // Wrap informations needed to match the request
    // NOTE: Here we convert everything to lowercase
    // since we only support case-insensitive matching
    const request = {
      // Request
      url,
      cpt: httpContext.getContentPolicyType(),
      tokens: tokenizeURL(url),
      // Source
      sourceURL: source,
      sourceHostname,
      sourceGD,
      // Endpoint
      hostname,
      hostGD,
    };

    log(`match ${JSON.stringify(request)}`);

    const t0 = Date.now();
    const isAd = this.isInBlacklist(request) ? false : this.cache.get(request);
    const totalTime = Date.now() - t0;

    log(`BLOCK AD ${JSON.stringify({
      timeAdFilter: totalTime,
      isAdFilter: isAd,
      context: {
        url: httpContext.url,
        source: httpContext.getSourceURL(),
        cpt: httpContext.getContentPolicyType(),
        method: httpContext.method,
      },
    })}`);

    return isAd;
  }
}

const CliqzADB = {
  adblockInitialized: false,
  adbMem: {},
  adbStats: { pages: {} },
  mutationLogger: null,
  adbDebug: false,
  MIN_BROWSER_VERSION: 35,
  timers: [],

  init() {
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
      WebRequest.onBeforeRequest.addListener(
        CliqzADB.httpopenObserver.observe,
        undefined,
        ['blocking']
      );
    };

    if (adbEnabled()) {
      initAdBlocker();
    } else {
      events.sub('prefchange', pref => {
        if (pref === ADB_PREF &&
            !CliqzADB.adblockInitialized &&
            adbEnabled()) {
          initAdBlocker();
        }
      });
    }
  },

  unload() {
    CliqzADB.unloadPacemaker();
    browser.forEachWindow(CliqzADB.unloadWindow);
    WebRequest.onBeforeRequest.removeListener(CliqzADB.httpopenObserver.observe);
    ContentPolicy.unload();
  },

  initWindow(window) {
    if (CliqzADB.mutationLogger !== null) {
      window.gBrowser.addProgressListener(CliqzADB.mutationLogger);
    }
  },

  unloadWindow(window) {
    if (window.gBrowser && CliqzADB.mutationLogger !== null) {
      window.gBrowser.removeProgressListener(CliqzADB.mutationLogger);
    }
  },

  initPacemaker() {
    const t1 = utils.setInterval(() => {
      Object.keys(CliqzADB.adbStats.pages).forEach(url => {
        if (!CliqzADB.isTabURL[url]) {
          delete(CliqzADB.adbStats.pages[url]);
        }
      });
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);

    const t2 = utils.setInterval(() => {
      Object.keys(CliqzADB.cacheADB).forEach(t => {
        if (!browser.isWindowActive(t)) {
          delete CliqzADB.cacheADB[t];
        }
      });
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t2);
  },

  unloadPacemaker() {
    CliqzADB.timers.forEach(utils.clearTimeout);
  },

  httpopenObserver: {
    observe(requestDetails) {
      if (!adbEnabled()) {
        return {};
      }

      const requestContext = new HttpRequestContext(requestDetails);
      const url = requestContext.url;

      if (!url) {
        return {};
      }

      const urlParts = URLInfo.get(url);

      if (requestContext.isFullPage()) {
        CliqzADB.adbStats.pages[url] = 0;
      }

      const sourceUrl = requestContext.getLoadingDocument();
      let sourceUrlParts = null;
      const sourceTab = requestContext.getOriginWindowID();

      if (!sourceUrl || sourceUrl.startsWith('about:')) {
        return {};
      }

      sourceUrlParts = URLInfo.get(sourceUrl);

      // same general domain
      const sameGd = sameGeneralDomain(urlParts.hostname, sourceUrlParts.hostname) || false;
      if (sameGd) {
        const wOri = requestContext.getOriginWindowID();
        const wOut = requestContext.getOuterWindowID();
        if (wOri !== wOut) { // request from iframe
          const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
            .getService(Components.interfaces.nsIWindowMediator);
          const frame = wm.getOuterWindowWithId(wOut).frameElement;

          if (adbEnabled() && CliqzADB.adBlocker.match(requestContext)) {
            frame.style.display = 'none';  // hide this node
            CliqzADB.adbStats.pages[sourceUrl] = (CliqzADB.adbStats.pages[sourceUrl] || 0) + 1;

            frame.setAttribute('cliqz-adb', `source: ${url}`);
            return { cancel: true };
          }
          frame.setAttribute('cliqz-adblocker', 'safe');
        }
        return {};
      } else if (adbEnabled()) {
        if (CliqzADB.mutationLogger.tabsInfo[sourceTab] &&
            !CliqzADB.mutationLogger.tabsInfo[sourceTab].observerAdded) {
          CliqzADB.mutationLogger.addMutationObserver(sourceTab);
        }
        if (CliqzADB.adBlocker.match(requestContext)) {
          hideNodes(requestContext);
          return { cancel: true };
        }
      }
      return {};
    },
  },
  getBrowserMajorVersion() {
    const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
                    .getService(Components.interfaces.nsIXULAppInfo);
    return parseInt(appInfo.version.split('.')[0], 10);
  },
  isTabURL(url) {
    const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator);
    const browserEnumerator = wm.getEnumerator('navigator:browser');

    while (browserEnumerator.hasMoreElements()) {
      const browserWin = browserEnumerator.getNext();
      const tabbrowser = browserWin.gBrowser;

      const numTabs = tabbrowser.browsers.length;
      for (let index = 0; index < numTabs; index++) {
        const currentBrowser = tabbrowser.getBrowserAtIndex(index);
        if (currentBrowser) {
          const tabURL = currentBrowser.currentURI.spec;
          if (url === tabURL || url === tabURL.split('#')[0]) {
            return true;
          }
        }
      }
    }
    return false;
  },
};

export default CliqzADB;
