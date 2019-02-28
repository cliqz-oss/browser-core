import ResourceLoader, { Resource, UpdateCallbackHandler } from '../core/resource-loader';
import Language from '../core/language';
import { isMobile } from '../core/platform';
import logger from './logger';
import config from '../core/config';
import { fetch } from '../core/http';

// Disk persisting
const RESOURCES_PATH = ['adblocker'];


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;

// language factor
const LANG_FACTOR = 20;


// URLs to fetch block lists
// We need to map the platformName to the names we use in the adblocker lists:
// - mobile has been moved to a non-standard path
// - firefox is currently used for any browser (including chromium), it should
//   be renamed to 'browser' in the future, or 'firefox', 'chromium', etc.
//   should simply be aliases for 'browser'.
const PLATFORM = isMobile ? 'mobile-new' : 'firefox';
const CDN_URL = `${config.settings.CDN_BASEURL}/adblocking`;
const BASE_URL = `${CDN_URL}/latest-filters/`;


function stripProtocol(url) {
  let result = url;
  ['http://', 'https://'].forEach((prefix) => {
    if (result.startsWith(prefix)) {
      result = result.substring(prefix.length);
    }
  });

  return result;
}


function getAssetName(asset) {
  if (asset.endsWith('resources.txt')) {
    return 'resources.txt';
  }

  return stripProtocol(asset);
}

export class FiltersList {
  constructor(checksum, asset, remoteURL) {
    this.checksum = checksum;
    this.baseRemoteURL = remoteURL;
    this.assetName = getAssetName(asset);

    const load = () => fetch(this.remoteURL()).then(response => response.text());

    // We still need caching for mobile
    if (isMobile) {
      this.resource = new Resource(
        RESOURCES_PATH.concat(this.assetName.split('/')),
        { remoteURL: this.remoteURL(), dataType: 'plainText' },
      );
    } else {
      this.resource = {
        load,
        updateFromRemote: load,
      };
    }
  }

  remoteURL() {
    return `${this.baseRemoteURL}`;
  }

  load() {
    return this.resource
      .load()
      .then(this.updateList.bind(this))
      .catch((e) => {
        logger.error(`exception while loading ${this.assetName} ${e} ${e.stack}`);
      });
  }

  update() {
    return this.resource
      .updateFromRemote()
      .then(this.updateList.bind(this))
      .catch((e) => {
        logger.error(`exception while updating ${this.assetName} ${e} ${e.stack}`);
      });
  }

  needsToUpdate(checksum) {
    return checksum !== this.checksum;
  }

  stop() {
  }

  updateFromChecksum(checksum) {
    this.resource.remoteURL = this.remoteURL();
    this.checksum = checksum;
    return this.update();
  }

  updateList(data) {
    const trimmed = data.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }

    return undefined;
  }
}


/* Class responsible for loading, persisting and updating filters lists.
 */
export default class FiltersLoader extends UpdateCallbackHandler {
  constructor(useCountryLists, adbLangOverride) {
    super();

    // Manage country-specific lists preferences
    this.useCountryLists = useCountryLists;
    this.adbLangOverride = adbLangOverride;

    // Resource managing the allowed lists for the adblocker
    this.allowedListsLoader = new ResourceLoader(
      RESOURCES_PATH.concat(PLATFORM, 'checksums'),
      {
        cron: 24 * ONE_HOUR,
        updateInterval: 15 * ONE_MINUTE,
        dataType: 'json',
        remoteURL: this.remoteURL(),
        remoteOnly: true,
      },
    );
    this.allowedListsLoader.onUpdate(this.updateChecksums.bind(this));

    this.initLists();
  }

  initLists() {
    // Lists of filters currently loaded
    this.lists = new Map();
    // Available languages from filter lists
    this.availableLang = new Set();
    // Currently used language
    this.loadedLang = new Set();
  }

  remoteURL() {
    return `${CDN_URL}/${PLATFORM}/allowed-lists.json?t=${parseInt(Date.now() / 60 / 60 / 1000, 10)}`;
  }

  stop() {
    this.allowedListsLoader.stop();
  }

  load() {
    return this.allowedListsLoader
      .load()
      .then(this.updateChecksums.bind(this))
      .catch((e) => {
        logger.error(`exception while loading allowed lists ${e} ${e.stack}`);
      });
  }

  update() {
    return this.allowedListsLoader
      .updateFromRemote()
      .catch((e) => {
        logger.error(`exception while updating allowed lists ${e} ${e.stack}`);
      });
  }

  getLoadedAssets() {
    return new Set(this.lists.keys());
  }

  // Private API
  userOverrides() {
    const langOverride = this.adbLangOverride;
    if (typeof langOverride === 'string' && langOverride !== '') {
      return langOverride.split(';');
    }

    return null;
  }

  userLang() {
    // Check if language specific filters are disabled
    if (!this.useCountryLists) {
      return [];
    }

    // check if language override exists (use even if empty)
    const overrides = this.userOverrides();
    if (overrides !== null) {
      return overrides;
    }

    if (Language.state) {
      // the most used language is always loaded,
      // for the rest, only if they reach a proportion of the most used one
      const userLang = [];
      const langDist = Language.state(true);
      // langDist: [['de', 0.001], ... ]

      if (langDist.length > 0) {
        // add most used language
        userLang.push(langDist[0][0]);
        const mostUsedCount = langDist[0][1];

        // check the rest
        langDist.shift(0);
        langDist.filter(langVal => langVal[1] < mostUsedCount * LANG_FACTOR)
          .map(langVal => userLang.push(langVal[0]));
      }

      return userLang;
    }

    return ['en'];
  }

  updateChecksums(allowedLists) {
    // Update URL with current timestamp to play well with caching
    this.allowedListsLoader.resource.remoteURL = this.remoteURL();

    const filtersLists = new Map();

    this.availableLang = new Set();
    this.loadedLang = new Set();
    const userLang = this.userLang();
    Object.keys(allowedLists).forEach((section) => {
      Object.keys(allowedLists[section]).forEach((asset) => {
        const checksum = allowedLists[section][asset].checksum;
        const assetName = getAssetName(asset);
        const filterRemoteURL = BASE_URL + stripProtocol(asset);
        let loadList = false;

        if (section === 'country_lists') {
          const language = allowedLists[section][asset].language;
          if (language) {
            language.split(/\s+/g).forEach((lang) => {
              this.availableLang.add(lang);
              if (userLang.indexOf(lang) !== -1) {
                this.loadedLang.add(lang);
                loadList = true;
              }
            });
          }
        } else {
          loadList = true;
        }

        if (loadList) {
          filtersLists.set(assetName, {
            checksum,
            asset: assetName,
            remoteURL: filterRemoteURL,
            key: section,
          });
        }
      });
    });

    return this.updateLists(filtersLists);
  }

  updateLists(filtersLists) {
    const updatedLists = [];

    // Remove loaded lists that are not part of the filtersList
    [...this.lists.keys()].forEach((asset) => {
      if (!filtersLists.has(asset)) {
        this.lists.delete(asset);
      }
    });

    // Update loaded list from new checksums
    filtersLists.forEach((newList) => {
      const { checksum, asset, remoteURL, key } = newList;
      const isFiltersList = key !== 'js_resources';

      if (!this.lists.has(asset)) {
        // Create a new list
        const list = new FiltersList(checksum, asset, remoteURL);
        this.lists.set(asset, list);

        // Load the list async
        updatedLists.push(
          list
            .load()
            .then((filters) => {
              // Ignore any empty list
              if (filters !== undefined) {
                return {
                  asset,
                  filters,
                  isFiltersList,
                  checksum: list.checksum,
                };
              }

              return undefined;
            }),
        );
      } else {
        // Retrieve existing list
        let list = this.lists.get(asset);

        // Update the list only if needed (checksum is different)
        if (list.needsToUpdate(checksum)) {
          // Make sure the filters list has a proper update url
          list = new FiltersList(checksum, asset, remoteURL);
          updatedLists.push(
            list
              .updateFromChecksum(checksum)
              .then((filters) => {
                // Ignore any empty list
                if (filters !== undefined) {
                  return {
                    asset,
                    filters,
                    isFiltersList,
                    checksum: list.checksum,
                  };
                }

                return undefined;
              }),
          );
        }
      }
    });

    // Wait for all lists to be fetched, filters the empty ones and
    // trigger callback (will typically trigger a FiltersEngine update)
    return Promise.all(updatedLists)
      .then(filters => filters.filter(f => f !== undefined))
      .then(filters => this.triggerCallbacks(filters));
  }
}
