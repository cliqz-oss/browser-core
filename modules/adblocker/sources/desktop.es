import Adblocker from '../platform/lib/adblocker';

import PersistentMap from '../core/persistence/map';
import prefs from '../core/prefs';
import { isOnionModeFactory } from '../core/platform';

import AdBlockerBase from './base';
import FiltersLoader, { FiltersList } from './filters-loader';
import logger from './logger';
import { DEFAULT_OPTIONS, ADB_USER_LANG } from './config';


const isOnionMode = isOnionModeFactory(prefs);

export default class AdBlocker extends AdBlockerBase {
  constructor(options) {
    super();

    const {
      onDiskCache,
      loadNetworkFilters,
      loadCosmeticFilters,
      useCountryList,
    } = Object.assign({}, DEFAULT_OPTIONS, options);

    this.useCountryList = useCountryList;
    this.onDiskCache = onDiskCache;
    this.loadNetworkFilters = loadNetworkFilters;
    this.loadCosmeticFilters = loadCosmeticFilters;

    this.listsManager = null;
    this.resetLists();
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
        if (!isFiltersList && this.engine.resources.checksum !== checksum) {
          this.log(`Resources list ${asset} (${checksum}) will be updated`);
          return true;
        }
        return false;
      });

      if (resourcesLists.length > 0) {
        const startResourcesUpdate = Date.now();
        const { filters, checksum } = resourcesLists[0];
        this.engine.updateResources(filters, checksum);
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
      }).map(({ asset, checksum, filters }) => ({ name: asset, checksum, list: filters }));

      const startFiltersUpdate = Date.now();

      // Check if some lists need to be deleted
      const listsToDelete = new Set();
      const loadedLists = this.listsManager.getLoadedAssets();
      this.engine.loadedLists().forEach((name) => {
        if (!loadedLists.has(name)) {
          listsToDelete.add(name);
        }
      });

      if (listsToDelete.size !== 0) {
        this.engine.deleteLists([...listsToDelete]);
      }

      const hasBeenUpdated = this.engine.updateLists(filtersLists);
      this.log(`Engine updated with ${filtersLists.length} lists`
        + ` (${Date.now() - startFiltersUpdate} ms)`);

      // Serialize new version of the engine on disk if needed
      // We need to avoid dumping data on disk in Onion mode.
      if (this.onDiskCache && !isOnionMode() && hasBeenUpdated) {
        const t0 = Date.now();
        const db = new PersistentMap('cliqz-adb');
        const serializedEngine = this.engine.serialize();
        this.log(`Serialized engine size: ${serializedEngine.byteLength}`);
        db.init()
          .then(() => db.set(
            'engine',
            serializedEngine
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
    });
  }

  loadEngineFromDisk() {
    if (this.onDiskCache) {
      const db = new PersistentMap('cliqz-adb');
      return db.init()
        .then(() => db.get('engine'))
        .then((serializedEngine) => {
          const t0 = Date.now();
          this.engine = Adblocker.FiltersEngine.deserialize(serializedEngine);
          this.listsManager.lists = new Map();
          this.engine.lists.lists.forEach((list, asset) => {
            const filterslist = new FiltersList(
              list.checksum,
              asset,
              '' // If checksum does not match, the list will be updated with a proper url
            );
            this.listsManager.lists.set(asset, filterslist);
          });

          // Also restore the resources.txt in filters loader
          const resourcesAsset = 'resources.txt';
          this.listsManager.lists.set(resourcesAsset, new FiltersList(
            this.engine.resources.checksum,
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

  reset() {
    return this.resetCache()
      .then(() => this.resetEngine())
      .then(() => this.resetLists())
      .then(() => this.listsManager.load());
  }

  unload() {
    clearTimeout(this.loadingTimer);
    this.listsManager.stop();
  }
}
