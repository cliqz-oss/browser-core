import { utils, events } from '../core/cliqz';
import inject from '../core/kord/inject';
import console from '../core/console';

import { URLInfo } from '../antitracking/url';
import { getGeneralDomain } from '../antitracking/domain';

import { LazyPersistentObject } from '../antitracking/persistent-state';
import LRUCache from '../core/helpers/fixed-size-cache';

import logger from './logger';
import { fastStartsWith } from './utils';
import FilterEngine from '../adblocker/filters-engine';
import FiltersLoader from '../adblocker/filters-loader';
import AdbStats from '../adblocker/adb-stats';

import { Resource } from '../core/resource-loader';
import { platformName } from '../core/platform';

// Disk persisting
const SERIALIZED_ENGINE_PATH = ['adblocker', 'engine.json'];


// adb version
export const ADB_VERSION = 7;

// Preferences
export const ADB_DISK_CACHE = 'cliqz-adb-disk-cache';
export const ADB_PREF = 'cliqz-adb';
export const ADB_PREF_OPTIMIZED = 'cliqz-adb-optimized';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_PREF_VALUES = {
  Enabled: 1,
  Disabled: 0,
};
export const ADB_DEFAULT_VALUE = ADB_PREF_VALUES.Disabled;
export const ADB_USER_LANG = 'cliqz-adb-lang';


export function adbABTestEnabled() {
  return utils.getPref(ADB_ABTEST_PREF, false);
}


export function adbEnabled() {
  // 0 = Disabled
  // 1 = Enabled
  return (
    adbABTestEnabled() &&
    utils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) !== ADB_PREF_VALUES.Disabled
  );
}


function extractGeneralDomain(uri) {
  const url = uri.toLowerCase();
  const urlParts = URLInfo.get(url);
  let hostname = urlParts.hostname;
  if (fastStartsWith(hostname, 'www.')) {
    hostname = hostname.substr(4);
  }
  return getGeneralDomain(hostname);
}


function isSupportedProtocol(url) {
  return (
    fastStartsWith(url, 'http://') ||
    fastStartsWith(url, 'https://') ||
    fastStartsWith(url, 'ws://') ||
    fastStartsWith(url, 'wss://'));
}


const CPT_TO_NAME = {
  1: 'other',
  2: 'script',
  3: 'image',
  4: 'css',
  5: 'object',
  6: 'document',
  7: 'iframe',
  8: 'refresh',
  9: 'xbl',
  10: 'ping',
  11: 'xhr',
  12: 'object_subrequest',
  13: 'dtd',
  14: 'font',
  15: 'media',
  16: 'websocket',
  17: 'csp_report',
  18: 'xslt',
  19: 'beacon',
  20: 'fetch',
  21: 'imageset',
};


const DEFAULT_OPTIONS = {
  onDiskCache: true,
  useCountryList: true,
  loadNetworkFilters: true,

  // We don't support cosmetics filters on mobile, so no need
  // to parse them, store them, etc.
  // This will reduce both: loading time, memory footprint, and size of
  // the serialized index on disk.
  loadCosmeticFilters: platformName !== 'mobile',
};


/* Wraps filter-based adblocking in a class. It has to handle both
 * the management of lists (fetching, updating) using a FiltersLoader
 * and the matching using a FilterEngine.
 */
export class AdBlocker {
  constructor(humanWeb, options) {
    // Get options
    const { onDiskCache
          , loadNetworkFilters
          , loadCosmeticFilters
          , useCountryList } = Object.assign({}, DEFAULT_OPTIONS, options);

    this.useCountryList = useCountryList;
    this.onDiskCache = onDiskCache;
    this.humanWeb = humanWeb;
    this.loadNetworkFilters = loadNetworkFilters;
    this.loadCosmeticFilters = loadCosmeticFilters;

    // This flag will be set to true only when the diagnosis page is opened
    this.diagnosisEnabled = false;
    this.blockingLogger = new Map();
    this.logs = [];
    this.engine = null;
    this.resetEngine();

    this.listsManager = null;
    this.resetLists();

    // Blacklists to disable adblocking on certain domains/urls
    this.blacklist = new Set();
    this.blacklistPersist = new LazyPersistentObject('adb-blacklist');
  }

  log(msg) {
    const date = new Date();
    const message = `${date.getHours()}:${date.getMinutes()} ${msg}`;
    this.logs.push(message);
    console.log(msg, 'adblocker');
  }

  logBlocking(httpContext, isAd, totalTime) {
    // Only enabled when the diagnosis page is opened
    if (this.diagnosisEnabled) {
      if (httpContext.cpt === 6 || !this.blockingLogger.has(httpContext.sourceUrl)) {
        this.blockingLogger.set(httpContext.sourceUrl, [`<tr>
          <th>Time</th>
          <th>Blocked</th>
          <th>Redirect</th>
          <th>Filter</th>
          <th>Cpt</th>
          <th>Url</th>
        </tr>`]);
      }

      let color = 'white';
      if (isAd.redirect) {
        color = '#ffe552';
      } else if (isAd.exception) {
        color = '#33cc33';
      } else if (isAd.match) {
        color = '#ff5050';
      }

      this.blockingLogger.get(httpContext.sourceUrl).push(`<tr
        style="background: ${color}">
        <td>${totalTime}</td>
        <td>${!!isAd.match}</td>
        <td>${!!isAd.redirect}</td>
        <td>${isAd.filter || ''}</td>
        <td>${CPT_TO_NAME[httpContext.cpt] || httpContext.cpt}</td>
        <td>${httpContext.url}</td>
      </tr>`);
    }
  }

  resetLists() {
    if (this.listsManager !== null) {
      this.listsManager.stop();
    }

    // Plug filters lists manager with engine to update it
    // whenever a new version of the rules is available.
    this.listsManager = new FiltersLoader(
      this.useCountryList,
      utils.getPref(ADB_USER_LANG, null)
    );
    this.listsManager.onUpdate((updates) => {
      // -------------------- //
      // Update filters lists //
      // -------------------- //
      const filtersLists = updates.filter((update) => {
        const { asset, checksum, isFiltersList } = update;
        if (isFiltersList && !this.engine.hasList(asset, checksum)) {
          this.log(`Filters list ${asset} (${checksum}) will be updated`);
          return true;
        }
        return false;
      });

      if (filtersLists.length > 0) {
        const startFiltersUpdate = Date.now();
        this.engine.onUpdateFilters(filtersLists, this.listsManager.getLoadedAssets());
        this.log(`Engine updated with ${filtersLists.length} lists` +
                 ` (${Date.now() - startFiltersUpdate} ms)`);
      } else {
        // Call the method with an empty list + the list of loaded filters to
        // trigger clean-up of removed lists if needed.
        this.engine.onUpdateFilters([], this.listsManager.getLoadedAssets());
      }

      // ---------------------- //
      // Update resources lists //
      // ---------------------- //
      const resourcesLists = updates.filter((update) => {
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
      if (this.onDiskCache) {
        if (this.engine.updated) {
          const t0 = Date.now();
          new Resource(SERIALIZED_ENGINE_PATH, { dataType: 'plain' })
            .persist(this.engine.stringify())
            .then(() => {
              const totalTime = Date.now() - t0;
              this.log(`Serialized filters engine on disk (${totalTime} ms)`);
              this.engine.updated = false;
            })
            .catch((e) => {
              this.log(`Failed to serialize filters engine on disk ${e}`);
            });
        } else {
          this.log('Engine has not been updated, do not serialize');
        }
      }
    });
  }

  resetEngine() {
    this.engine = new FilterEngine({
      version: ADB_VERSION,
      loadNetworkFilters: this.loadNetworkFilters,
      loadCosmeticFilters: this.loadCosmeticFilters,
    });
  }

  initCache() {
    // To make sure we don't break any filter behavior, each key in the LRU
    // cache is made up of { source general domain } + { url }.
    // This is because some filters will behave differently based on the
    // domain of the source.

    // Cache queries to FilterEngine
    this.cache = new LRUCache(
      this.engine.match.bind(this.engine),       // Compute result
      1000,                                      // Maximum number of entries
      request => getGeneralDomain(request.sourceUrl) + request.url, // Select key
    );
  }

  loadEngineFromDisk() {
    if (this.onDiskCache) {
      return new Resource(SERIALIZED_ENGINE_PATH, { dataType: 'plain' })
        .load()
        .then((serializedEngine) => {
          if (serializedEngine !== undefined) {
            try {
              const t0 = Date.now();
              this.engine.load(serializedEngine);
              const totalTime = Date.now() - t0;
              this.log(`Loaded filters engine from disk (${totalTime} ms)`);
            } catch (e) {
              // In case there is a mismatch between the version of the code
              // and the serialization format of the engine on disk, we might
              // not be able to load the engine from disk. Then we just start
              // fresh!
              this.resetEngine();
              this.log(`Exception while loading engine from disk ${e} ${e.stack}`);
            }
          } else {
            this.log('No filter engine was serialized on disk');
          }
        })
        .catch(() => {
          this.log('No engine on disk', 'adblocker');
        });
    }

    return Promise.resolve();
  }

  init() {
    this.initCache();

    return this.blacklistPersist.load().then((value) => {
      // Set value
      if (value.urls !== undefined) {
        this.blacklist = new Set(value.urls);
      }
    }).then(() => this.loadEngineFromDisk())
      .then(() => this.listsManager.load())
      .then(() => {
        // Update check should be performed after a short while
        this.log('Check for updates');
        this.loadingTimer = utils.setTimeout(
          () => this.listsManager.update(),
          30 * 1000);
      });
  }

  unload() {
    utils.clearTimeout(this.loadingTimer);
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
    return (this.isUrlInBlacklist(request.sourceUrl) ||
            this.blacklist.has(request.sourceGD));
  }

  isDomainInBlacklist(url) {
    // Should all this domain stuff be extracted into a function?
    // Why is utils.detDetailsFromUrl not used?
    let hostname = url;
    try {
      hostname = extractGeneralDomain(url);
    } catch (e) {
      // In case of ill-formed URL, just do a normal loopup
    }

    return this.blacklist.has(hostname);
  }

  isUrlInBlacklist(url) {
    const processedURL = utils.cleanUrlProtocol(url, true);
    return this.blacklist.has(processedURL);
  }

  logActionHW(url, action, domain) {
    let type = 'url';
    if (domain) {
      type = 'domain';
    }
    const data = {};
    data[action] = type;
    return this.humanWeb.action('addDataToUrl', url, 'adblocker_blacklist', data);
  }

  toggleUrl(url, domain) {
    let processedURL = url;
    if (domain) {
      try {
        processedURL = extractGeneralDomain(processedURL);
      } catch (e) {
        // If there is no general domain to be extracted, it means the URL is
        // not correct. Hence we can just ignore it. (eg: about:config).
        return;
      }
    } else {
      processedURL = utils.cleanUrlProtocol(processedURL, true);
    }

    const checkProcessing = this.humanWeb.action('isProcessingUrl', url);
    checkProcessing.catch(() => {
      logger.error('no humanweb -> black/whitelist will not be logged');
    });
    const existHW = checkProcessing.then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
    if (this.blacklist.has(processedURL)) {
      this.blacklist.delete(processedURL);
      // TODO: It's better to have an API from humanweb to indicate if a url is private
      existHW.then(this.logActionHW.bind(this, url, 'remove', domain), () => logger.error('url does not exist in hw'));
    } else {
      this.blacklist.add(processedURL);
      existHW.then(this.logActionHW.bind(this, url, 'add', domain), () => logger.error('url does not exist in hw'));
    }

    this.persistBlacklist();
  }

  /* @param {Object} httpContext - Context of the request { url, sourceUrl, cpt }
   */
  match(httpContext) {
    const t0 = Date.now();
    const isAd = this.cache.get(httpContext);
    const totalTime = Date.now() - t0;

    // Keeps track of altered requests (only if the diagnosis page is opened)
    this.logBlocking(httpContext, isAd, totalTime);

    return isAd;
  }
}

const CliqzADB = {
  adblockInitialized: false,
  adbStats: new AdbStats(),
  adBlocker: null,
  MIN_BROWSER_VERSION: 35,
  timers: [],
  webRequestPipeline: inject.module('webrequest-pipeline'),

  init(humanWeb) {
    // Set `cliqz-adb` default to 'Disabled'
    if (utils.getPref(ADB_PREF, null) === null) {
      utils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
    }

    const initAdBlocker = () => {
      CliqzADB.adblockInitialized = true;
      CliqzADB.adBlocker = new AdBlocker(humanWeb, {
        onDiskCache: utils.getPref(ADB_DISK_CACHE, DEFAULT_OPTIONS.onDiskCache),
        useCountryList: utils.getPref(ADB_USER_LANG, DEFAULT_OPTIONS.useCountryList),
      });

      return CliqzADB.adBlocker.init().then(() => {
        CliqzADB.initPacemaker();
        return CliqzADB.webRequestPipeline.action('addPipelineStep',
          'open',
          {
            name: 'adblocker',
            fn: CliqzADB.adblockerPipelineStep,
          },
        );
      });
    };

    this.onPrefChangeEvent = events.subscribe('prefchange', (pref) => {
      if (pref === ADB_PREF) {
        if (!CliqzADB.adblockInitialized && adbEnabled()) {
          initAdBlocker();
        } else if (CliqzADB.adblockInitialized && !adbEnabled()) {
          // Shallow unload
          CliqzADB.unload(false);
        }
      }
    });

    if (adbEnabled()) {
      return initAdBlocker();
    }

    return Promise.resolve();
  },

  unload(fullUnload = true) {
    if (CliqzADB.adblockInitialized) {
      CliqzADB.adBlocker.unload();
      CliqzADB.adBlocker = null;
      CliqzADB.adblockInitialized = false;

      CliqzADB.unloadPacemaker();

      CliqzADB.webRequestPipeline.action('removePipelineStep', 'open', 'adblocker');
    }

    // If this is full unload, we also remove the pref listener
    if (fullUnload) {
      if (this.onPrefChangeEvent) {
        this.onPrefChangeEvent.unsubscribe();
      }
    }
  },

  initPacemaker() {
    const t1 = utils.setInterval(() => {
      CliqzADB.adbStats.clearStats();
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);
  },

  unloadPacemaker() {
    CliqzADB.timers.forEach(utils.clearTimeout);
  },

  adblockerPipelineStep(state, response) {
    if (!(adbEnabled() && CliqzADB.adblockInitialized)) {
      return true;
    }

    const requestContext = state.requestContext;
    const url = requestContext.url;


    if (!url || !isSupportedProtocol(url)) {
      return true;
    }

    // This is the Url
    const sourceUrl = requestContext.getSourceURL() || '';
    if (!isSupportedProtocol(sourceUrl)) {
      return true;
    }

    if (state.cpt === 6) {
      // Loading document
      CliqzADB.adbStats.addNewPage(sourceUrl, state.tabId);
      return true;
    }

    // We do it here because the Adblocker might be used by other modules
    // (like green-ads), and they should not be subjected to whitelists.
    const sourceGD = extractGeneralDomain(sourceUrl);
    if (CliqzADB.adBlocker.isInBlacklist({ sourceUrl, sourceGD })) {
      return true;
    }

    const result = CliqzADB.adBlocker.match({
      sourceUrl,
      url,
      cpt: state.cpt,
    });
    if (result.redirect) {
      response.redirectTo(result.redirect);
      return false;
    } else if (result.match) {
      CliqzADB.adbStats.addBlockedUrl(sourceUrl, url, state.tabId);
      response.block();
      return false;
    }

    return true;
  },
};

export default CliqzADB;
