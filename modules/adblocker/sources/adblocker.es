import { utils, events } from 'core/cliqz';
import WebRequest from 'core/webrequest';

import { URLInfo } from 'antitracking/url';
import { getGeneralDomain } from 'antitracking/domain';
import * as browser from 'platform/browser';

import { LazyPersistentObject } from 'antitracking/persistent-state';
import LRUCache from 'antitracking/fixed-size-cache';
import HttpRequestContext from 'antitracking/webrequest-context';

import { log } from 'adblocker/utils';
import FilterEngine, { serializeFiltersEngine
                     , deserializeFiltersEngine } from 'adblocker/filters-engine';
import FiltersLoader from 'adblocker/filters-loader';
import AdbStats from 'adblocker/adb-stats';

import CliqzHumanWeb from 'human-web/human-web';
import { Resource } from 'core/resource-loader';


// Disk persisting
const SERIALIZED_ENGINE_PATH = ['antitracking', 'adblocking', 'engine.json'];


// adb version
export const ADB_VER = 0.01;

// Preferences
export const ADB_PREF = 'cliqz-adb';
export const ADB_PREF_OPTIMIZED = 'cliqz-adb-optimized';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_PREF_VALUES = {
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
  return adbABTestEnabled() && CliqzUtils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) !== 0;
}


/* Wraps filter-based adblocking in a class. It has to handle both
 * the management of lists (fetching, updating) using a FiltersLoader
 * and the matching using a FilterEngine.
 */
class AdBlocker {
  constructor() {
    this.logs = [];
    this.engine = new FilterEngine();

    // Plug filters lists manager with engine to update it
    // whenever a new version of the rules is available.
    this.listsManager = new FiltersLoader();
    this.listsManager.onUpdate(updates => {
      // -------------------- //
      // Update fitlers lists //
      // -------------------- //
      const filtersLists = updates.filter(update => {
        const { asset, checksum, isFiltersList } = update;
        if (isFiltersList && !this.engine.hasList(asset, checksum)) {
          this.log(`Filters list ${asset} (${checksum}) will be updated`);
          return true;
        }
        return false;
      });

      if (filtersLists.length > 0) {
        const startFiltersUpdate = Date.now();
        this.engine.onUpdateFilters(filtersLists);
        this.log(`Engine updated with ${filtersLists.length} lists` +
                 ` (${Date.now() - startFiltersUpdate} ms)`);
      }

      // ---------------------- //
      // Update resources lists //
      // ---------------------- //
      const resourcesLists = updates.filter(update => {
        const { isFiltersList, asset, checksum } = update;
        if (!isFiltersList && this.engine.resourceChecksum !== checksum) {
          this.log(`Resources list ${asset} (${checksum}) will be updated`);
          return true;
        }
        return false;
      });

      if (resourcesLists.length > 0) {
        const startResourcesUpdate = Date.now();
        this.engine.onUpdateResource(resourcesLists);
        this.log(`Engine updated with ${resourcesLists.length} resources` +
                 ` (${Date.now() - startResourcesUpdate} ms)`);
      }

      // Flush the cache since the engine is now different
      this.initCache();

      // Serialize new version of the engine on disk if needed
      if (this.engine.updated) {
        const t0 = Date.now();
        new Resource(SERIALIZED_ENGINE_PATH)
          .persist(JSON.stringify(serializeFiltersEngine(this.engine)))
          .then(() => {
            const totalTime = Date.now() - t0;
            this.log(`Serialized filters engine on disk (${totalTime} ms)`);
            this.engine.updated = false;
          });
      } else {
        this.log('Engine has not been updated, do not serialize');
      }
    });

    // Blacklists to disable adblocking on certain domains/urls
    this.blacklist = new Set();
    this.blacklistPersist = new LazyPersistentObject('adb-blacklist');

    // Is the adblocker initialized
    this.initialized = false;
  }

  log(msg) {
    this.logs.push(msg);
    CliqzUtils.log(msg, 'adblocker');
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

    // Load serialized engine from disk, then init filters manager
    new Resource(SERIALIZED_ENGINE_PATH)
      .load()
      .then(serializedEngine => {
        if (serializedEngine !== undefined) {
          try {
            const t0 = Date.now();
            deserializeFiltersEngine(this.engine, serializedEngine);
            const totalTime = Date.now() - t0;
            this.log(`Loaded filters engine from disk (${totalTime} ms)`);
          } catch (e) {
            // In case there is a mismatch between the version of the code
            // and the serialization format of the engine on disk, we might
            // not be able to load the engine from disk. Then we just start
            // fresh!
            this.engine = new FilterEngine();
            this.log(`Exception while loading engine from disk ${e} ${e.stack}`);
          }
        } else {
          this.log('No filter engine was serialized on disk');
        }

        // Load files from disk, then check if we should update
        this.listsManager
          .load()
          .then(() => {
            // Update check should be performed after a short while
            CliqzUtils.log('Check for updates', 'adblocker');
            setTimeout(
              () => this.listsManager.update(),
              30 * 1000
            );
          });
      });

    this.blacklistPersist.load().then(value => {
      // Set value
      if (value.urls !== undefined) {
        this.blacklist = new Set(value.urls);
      }
    });
    this.initialized = true;
  }

  unload() {
    this.listsManager.stop();
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
    if (!utils.isUrl(url)) {
      return false;
    }
    const urlParts = URLInfo.get(url);
    let hostname = urlParts.hostname || url;
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
      if (utils.isUrl(processedURL)) {
        processedURL = URLInfo.get(url).hostname;
      }
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

    if (httpContext.isFullPage()) {
      // allow loading document
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
    const sourceURL = httpContext.getSourceURL().toLowerCase();
    const sourceParts = URLInfo.get(sourceURL);

    // It can happen when source is not a valid URL, then we simply
    // leave `sourceHostname` and `sourceGD` as undefined to allow
    // some filter matching on the request URL itself.
    let sourceHostname = sourceParts.hostname;
    let sourceGD;
    if (sourceHostname !== undefined) {
      if (sourceHostname.startsWith('www.')) {
        sourceHostname = sourceHostname.substring(4);
      }
      sourceGD = getGeneralDomain(sourceHostname);
    }

    // Wrap informations needed to match the request
    const request = {
      // Request
      url,
      cpt: httpContext.getContentPolicyType(),
      // Source
      sourceURL,
      sourceHostname,
      sourceGD,
      // Endpoint
      hostname,
      hostGD,
    };

    const t0 = Date.now();
    const isAd = this.isInBlacklist(request) ? { match: false } : this.cache.get(request);
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
  adbStats: new AdbStats(),
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
      this.onPrefChangeEvent = events.subscribe('prefchange', pref => {
        if ((pref === ADB_PREF || pref === ADB_ABTEST_PREF) &&
          !CliqzADB.adblockInitialized &&
          adbEnabled()) {
          // FIXME
          initAdBlocker();
        }
      });
    }
  },

  unload() {
    CliqzADB.adBlocker.unload();
    CliqzADB.adBlocker = null;
    CliqzADB.adblockInitialized = false;
    if (this.onPrefChangeEvent) {
      this.onPrefChangeEvent.unsubscribe();
    }
    CliqzADB.unloadPacemaker();
    browser.forEachWindow(CliqzADB.unloadWindow);
    WebRequest.onBeforeRequest.removeListener(CliqzADB.httpopenObserver.observe);
  },

  initWindow(/* window */) {
  },

  unloadWindow(/* window */) {
  },

  initPacemaker() {
    const t1 = utils.setInterval(() => {
      CliqzADB.adbStats.clearStats();
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);

    const t2 = utils.setInterval(() => {
      if (!CliqzADB.cacheADB) {
        return;
      }
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
      const requestContext = new HttpRequestContext(requestDetails);
      const url = requestContext.url;

      if (requestContext.isFullPage()) {
        CliqzADB.adbStats.addNewPage(url);
      }

      if (!adbEnabled() || !url) {
        return {};
      }

      const sourceUrl = requestContext.getSourceURL();

      if (!sourceUrl || sourceUrl.startsWith('about:')) {
        return {};
      }

      if (adbEnabled()) {
        const result = CliqzADB.adBlocker.match(requestContext);
        if (result.redirect) {
          return { redirectUrl: result.redirect };
        } else if (result.match) {
          CliqzADB.adbStats.addBlockedUrl(sourceUrl, url);
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
