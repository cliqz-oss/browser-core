import events from '../core/events';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import prefs from '../core/prefs';
import UrlWhitelist from '../core/url-whitelist';

import { deflate, inflate } from '../core/zlib';

import PersistentMap from '../core/persistence/map';
import { platformName, isOnionModeFactory } from '../core/platform';

import Adblocker from '../platform/lib/adblocker';

import AdbStats from './adb-stats';
import FiltersLoader, { FiltersList } from './filters-loader';
import logger from './logger';

import Pipeline from '../webrequest-pipeline/pipeline';

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
  return prefs.get(ADB_ABTEST_PREF, ADB_PREF_VALUES.Enabled);
}


export function isSupportedProtocol(url) {
  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('ws://')
    || url.startsWith('wss://'));
}

const isOnionMode = isOnionModeFactory(prefs);

const DEFAULT_OPTIONS = {
  onDiskCache: true,
  compressDiskCache: false,
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
 * and the matching using a FiltersEngine.
 */
export class AdBlocker {
  constructor(options) {
    // Get options
    const {
      onDiskCache,
      compressDiskCache,
      loadNetworkFilters,
      loadCosmeticFilters,
      useCountryList,
    } = Object.assign({}, DEFAULT_OPTIONS, options);

    this.useCountryList = useCountryList;
    this.onDiskCache = onDiskCache;
    this.compressDiskCache = compressDiskCache;
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
  }

  log(msg) {
    const date = new Date();
    const message = `${date.getHours()}:${date.getMinutes()} ${msg}`;
    this.logs.push(message);
    logger.log(msg);
  }

  logBlocking(request, matchResult, totalTime) {
    // Only enabled when the diagnosis page is opened
    if (this.diagnosisEnabled) {
      if (request.cpt === 6 || !this.blockingLogger.has(request.sourceUrl)) {
        this.blockingLogger.set(request.sourceUrl, [`<tr>
          <th>Time</th>
          <th>Blocked</th>
          <th>Redirect</th>
          <th>Filter</th>
          <th>Cpt</th>
          <th>Url</th>
        </tr>`]);
      }

      let color = 'white';
      if (matchResult.redirect) {
        color = '#ffe552';
      } else if (matchResult.exception) {
        color = '#33cc33';
      } else if (matchResult.match) {
        color = '#ff5050';
      }

      this.blockingLogger.get(request.sourceUrl).push(`<tr
        style="background: ${color}">
        <td>${totalTime}</td>
        <td>${matchResult.match}</td>
        <td>${!!matchResult.redirect}</td>
        <td>${matchResult.filter || matchResult.exception || ''}</td>
        <td>${request.type}</td>
        <td>${request.url}</td>
      </tr>`);
    }
  }

  resetLists() {
    this.log('Reset lists');

    if (this.listsManager !== null) {
      this.listsManager.stop();
    }

    // Plug filters lists manager with engine to update it
    // whenever a new version of the rules is available.
    this.listsManager = new FiltersLoader(
      this.useCountryList,
      prefs.get(ADB_USER_LANG, null)
    );
    this.listsManager.onUpdate((updates) => {
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
        this.log(`Engine updated with ${resourcesLists.length} resources`
                 + ` (${Date.now() - startResourcesUpdate} ms)`);
      }

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

      const startFiltersUpdate = Date.now();
      const loadedAssets = new Set(
        [...this.listsManager.getLoadedAssets()]
          .filter(asset => !asset.endsWith('resources.txt'))
      );
      const updateNeeded = (
        filtersLists.length !== 0
        || this.engine.lists.size !== loadedAssets.size
      );
      if (updateNeeded) {
        this.engine.onUpdateFilters(
          filtersLists,
          loadedAssets,
        );
        this.log(`Engine updated with ${filtersLists.length} lists`
          + ` (${Date.now() - startFiltersUpdate} ms)`);
      }

      // Serialize new version of the engine on disk if needed
      // We need to avoid dumping data on disk in Onion mode.
      if (this.onDiskCache && !isOnionMode() && updateNeeded) {
        const t0 = Date.now();
        const db = new PersistentMap('cliqz-adb');
        const serializedEngine = this.engine.serialize();
        db.init()
          .then(() => db.set(
            'engine',
            this.compressDiskCache ? deflate(serializedEngine) : serializedEngine
          ))
          .then(() => {
            const totalTime = Date.now() - t0;
            this.log(`Serialized filters engine (${totalTime} ms)`);
          })
          .catch((e) => {
            this.log(`Failed to serialize filters engine ${e}`);
          });
      } else {
        this.log('Engine has not been updated, do not serialize');
      }
    });
  }

  resetCache() {
    this.log('Reset cache');
    const db = new PersistentMap('cliqz-adb');
    return db.init()
      .then(() => db.delete('engine'))
      .catch((ex) => { logger.error('Error while resetCache', ex); });
  }

  resetEngine() {
    this.log('Reset engine');
    this.engine = new Adblocker.FiltersEngine({
      loadNetworkFilters: this.loadNetworkFilters,
      loadCosmeticFilters: this.loadCosmeticFilters,
      enableOptimizations: true,
      optimizeAOT: false,
    });
  }

  loadEngineFromDisk() {
    if (this.onDiskCache) {
      const db = new PersistentMap('cliqz-adb');
      return db.init()
        .then(() => db.get('engine'))
        .then((serializedEngine) => {
          const t0 = Date.now();
          this.engine = Adblocker.deserializeEngine(
            this.compressDiskCache ? inflate(serializedEngine) : serializedEngine,
          );
          this.listsManager.lists = new Map();
          this.engine.lists.forEach((list, asset) => {
            const filterslist = new FiltersList(
              list.checksum,
              asset,
              '' // If checksum does not match, the list will be update with a proper url
            );
            this.listsManager.lists.set(asset, filterslist);
          });

          // Also restore the resources.txt in filters loader
          const resourcesAsset = 'resources.txt';
          this.listsManager.lists.set(resourcesAsset, new FiltersList(
            this.engine.resourceChecksum,
            resourcesAsset,
            '',
          ));

          const totalTime = Date.now() - t0;
          this.log(`Loaded filters engine (${totalTime} ms)`);
        })
        .catch((ex) => {
          this.log(`Exception while loading engine ${ex}`);
          // In case there is a mismatch between the version of the code
          // and the serialization format of the engine on disk, we might
          // not be able to load the engine from disk. Then we just start
          // fresh!
          this.resetEngine();
        });
    }

    return Promise.resolve();
  }

  reset() {
    return this.resetCache()
      .then(() => this.resetEngine())
      .then(() => this.resetLists())
      .then(() => this.listsManager.load());
  }

  init() {
    return this.loadEngineFromDisk()
      .then(() => this.listsManager.load())
      .then(() => {
        // Update check should be performed after a short while
        this.log('Check for updates');
        this.loadingTimer = setTimeout(
          () => this.listsManager.update(),
          30 * 1000
        );
      });
  }

  unload() {
    clearTimeout(this.loadingTimer);
    this.listsManager.stop();
  }


  /* @param {Object} request - Context of the request { url, sourceUrl, cpt }
   */
  match(request) {
    const t0 = Date.now();
    const matchResult = this.engine.match(request);
    const totalTime = Date.now() - t0;

    // Keeps track of altered requests (only if the diagnosis page is opened)
    this.logBlocking(request, matchResult, totalTime);

    return matchResult;
  }
}

const CliqzADB = {
  adblockInitialized: false,
  adbStats: new AdbStats(),
  adBlocker: null,
  MIN_BROWSER_VERSION: 35,
  timers: [],
  webRequestPipeline: inject.module('webrequest-pipeline'),
  urlWhitelist: new UrlWhitelist('adb-blacklist'),
  humanWeb: null,
  paused: false,
  onBeforeRequestPipeline: null,
  whitelistChecks: [],

  adbEnabled() {
    // 0 = Disabled
    // 1 = Enabled
    return (
      !CliqzADB.paused
      && adbABTestEnabled()
      && prefs.get(ADB_PREF, ADB_PREF_VALUES.Disabled) !== ADB_PREF_VALUES.Disabled
    );
  },

  addWhiteListCheck(fn) {
    CliqzADB.whitelistChecks.push(fn);
  },

  cliqzWhitelisted(url) {
    return CliqzADB.urlWhitelist.isWhitelisted(url);
  },

  isAdbActive(url) {
    return CliqzADB.adbEnabled()
    && CliqzADB.adblockInitialized
    && !CliqzADB.whitelistChecks.some(fn => fn(url));
  },

  logActionHW(url, action, type) {
    const checkProcessing = CliqzADB.humanWeb.action('isProcessingUrl', url);
    checkProcessing.catch(() => {
      logger.log('no humanweb -> black/whitelist will not be logged');
    });
    const existHW = checkProcessing.then((exists) => {
      if (exists) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
    existHW.then(() => {
      const data = {};
      data[action] = type;
      return CliqzADB.humanWeb.action('addDataToUrl', url, 'adblocker_blacklist', data);
    }, () => logger.log('url does not exist in hw'));
  },

  init(humanWeb) {
    CliqzADB.humanWeb = humanWeb;
    // Set `cliqz-adb` default to 'Disabled'
    if (prefs.get(ADB_PREF, null) === null) {
      prefs.set(ADB_PREF, ADB_PREF_VALUES.Disabled);
    }

    const initAdBlocker = () => {
      CliqzADB.adblockInitialized = true;
      CliqzADB.adBlocker = new AdBlocker({
        onDiskCache: prefs.get(ADB_DISK_CACHE, DEFAULT_OPTIONS.onDiskCache),
        useCountryList: prefs.get(ADB_USER_LANG, DEFAULT_OPTIONS.useCountryList),
      });

      CliqzADB.onBeforeRequestPipeline = new Pipeline('adblocker', [
        {
          name: 'checkContext',
          spec: 'blocking',
          fn: CliqzADB.stepCheckContext,
        },
        {
          name: 'checkWhitelist',
          spec: 'break',
          fn: CliqzADB.stepCheckWhitelist,
        },
        {
          name: 'checkBlocklist',
          spec: 'blocking',
          fn: CliqzADB.stepOnBeforeRequest,
        },
      ]);

      CliqzADB.onHeadersReceivedPipeline = new Pipeline('adblocker', [
        {
          name: 'checkWhitelist',
          spec: 'break',
          fn: CliqzADB.stepCheckWhitelist,
        },
        {
          name: 'checkBlocklist',
          spec: 'blocking',
          fn: CliqzADB.stepOnHeadersReceived,
        },
      ]);

      CliqzADB.whitelistChecks.push(CliqzADB.cliqzWhitelisted);

      return CliqzADB.adBlocker.init().then(() => {
        CliqzADB.initPacemaker();
        return Promise.all([
          CliqzADB.webRequestPipeline.action(
            'addPipelineStep',
            'onBeforeRequest',
            {
              name: 'adblocker',
              spec: 'blocking',
              fn: (...args) => CliqzADB.onBeforeRequestPipeline.execute(...args),
              before: ['antitracking.onBeforeRequest'],
            },
          ),
          CliqzADB.webRequestPipeline.action(
            'addPipelineStep',
            'onHeadersReceived',
            {
              name: 'adblocker',
              spec: 'blocking',
              fn: (...args) => CliqzADB.onHeadersReceivedPipeline.execute(...args),
            },
          ),
        ]);
      });
    };

    this.onPrefChangeEvent = events.subscribe('prefchange', (pref) => {
      if (pref === ADB_PREF) {
        if (!CliqzADB.adblockInitialized && CliqzADB.adbEnabled()) {
          initAdBlocker();
        } else if (CliqzADB.adblockInitialized && !CliqzADB.adbEnabled()) {
          // Shallow unload
          CliqzADB.unload(false);
        }
      }
    });

    if (CliqzADB.adbEnabled()) {
      return CliqzADB.urlWhitelist.init()
        .then(() => initAdBlocker());
    }

    return Promise.resolve();
  },

  unload(fullUnload = true) {
    if (CliqzADB.adblockInitialized) {
      CliqzADB.adBlocker.unload();
      CliqzADB.adBlocker = null;
      CliqzADB.adblockInitialized = false;

      CliqzADB.unloadPacemaker();

      ifModuleEnabled(CliqzADB.webRequestPipeline.action('removePipelineStep', 'onBeforeRequest', 'adblocker'));
      ifModuleEnabled(CliqzADB.webRequestPipeline.action('removePipelineStep', 'onHeadersReceived', 'adblocker'));
    }

    // If this is full unload, we also remove the pref listener
    if (fullUnload) {
      if (this.onPrefChangeEvent) {
        this.onPrefChangeEvent.unsubscribe();
      }
    }
  },

  initPacemaker() {
    const t1 = setInterval(() => {
      CliqzADB.adbStats.clearStats();
    }, 10 * 60 * 1000);
    CliqzADB.timers.push(t1);
  },

  unloadPacemaker() {
    CliqzADB.timers.forEach(clearTimeout);
  },

  stepCheckContext(state, response) {
    if (!(CliqzADB.adbEnabled() && CliqzADB.adblockInitialized)) {
      return false;
    }

    // Due to unbreakable pipelines, blocked requests might still come to
    // adblocker, we can simply ignore them
    if (response.cancel === true || response.redirectUrl) {
      return false;
    }

    const url = state.url;

    if (!url || !isSupportedProtocol(url)) {
      return false;
    }

    // This is the Url
    const sourceUrl = state.sourceUrl || '';
    if (!isSupportedProtocol(sourceUrl)) {
      return false;
    }

    if (state.cpt === 6) {
      // Loading document
      CliqzADB.adbStats.addNewPage(sourceUrl, state.tabId);
      return false;
    }

    return true;
  },

  stepCheckWhitelist(state) {
    if (CliqzADB.urlWhitelist.isWhitelisted(state.sourceUrl || '')) {
      return false;
    }
    return true;
  },

  stepOnBeforeRequest(state, response) {
    const result = CliqzADB.adBlocker.match(Adblocker.makeRequest({
      url: state.url,
      hostname: state.urlParts.hostname,
      domain: state.urlParts.generalDomain,

      sourceUrl: state.url,
      sourceHostname: state.sourceUrlParts.hostname,
      sourceDomain: state.sourceUrlParts.generalDomain,

      type: state.type,
    }, {
      // Because we already provide information about `hostname` and `domain`
      // from the webrequest context, we do not need to provide parsing
      // utilities (usually we would pass in `tldts`).
      getDomain: () => '',
      getHostname: () => '',
    }));

    if (result.redirect) {
      response.redirectTo(result.redirect);
      return false;
    }

    if (result.match) {
      CliqzADB.adbStats.addBlockedUrl(state.sourceUrl, state.url, state.tabId, state.ghosteryBug);
      response.block();
      return false;
    }

    return true;
  },

  stepOnHeadersReceived(state, response) {
    if (state.type === 'main_frame') {
      const directives = CliqzADB.adBlocker.engine.getCSPDirectives(Adblocker.makeRequest({
        url: state.url,
        hostname: state.urlParts.hostname,
        domain: state.urlParts.generalDomain,

        type: state.type,
      }, {
        // Because we already provide information about `hostname` and `domain`
        // from the webrequest context, we do not need to provide parsing
        // utilities (usually we would pass in `tldts`).
        getDomain: () => '',
        getHostname: () => '',
      }));

      if (directives !== undefined) {
        const cspHeader = 'content-security-policy';
        const existingCSP = state.getResponseHeader(cspHeader);
        response.modifyResponseHeader(
          cspHeader,
          existingCSP === undefined ? directives : `${existingCSP}; ${directives}`,
        );
      }
    }

    return true;
  },
};

export default CliqzADB;
