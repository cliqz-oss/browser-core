import ResourceLoader, { Resource, UpdateCallbackHandler } from 'core/resource-loader';
import Language from 'core/language';
import { platformName } from 'core/platform';

// Disk persisting
const RESOURCES_PATH = ['antitracking', 'adblocking'];


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;


// URLs to fetch block lists
const BASE_URL = 'https://cdn.cliqz.com/adblocking/latest-filters/';

const LANGS = Language.state();
const EOL = '\n';


function stripProtocol(url) {
  let result = url;
  ['http://', 'https://'].forEach(prefix => {
    if (result.startsWith(prefix)) {
      result = result.substring(prefix.length);
    }
  });

  return result;
}


class FiltersList {
  constructor(checksum, asset, remoteURL) {
    this.checksum = checksum;
    this.baseRemoteURL = remoteURL;

    const assetName = stripProtocol(asset);

    this.resource = new Resource(
      RESOURCES_PATH.concat(assetName.split('/')),
      { remoteURL: this.remoteURL(), dataType: 'plainText' }
    );
  }

  remoteURL() {
    return `${this.baseRemoteURL}?t=${parseInt(Date.now() / 60 / 60 / 1000, 10)}`;
  }

  load() {
    return this.resource.load().then(this.updateList.bind(this));
  }

  update() {
    return this.resource.updateFromRemote().then(this.updateList.bind(this));
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
    const filters = data.split(EOL);
    if (filters.length > 0) {
      return filters;
    }
    return undefined;
  }
}


/* Class responsible for loading, persisting and updating filters lists.
 */
export default class extends UpdateCallbackHandler {

  constructor() {
    super();

    // Resource managing the allowed lists for the adblocker
    this.allowedListsLoader = new ResourceLoader(
      RESOURCES_PATH.concat('checksums'),
      {
        cron: 24 * ONE_HOUR,
        updateInterval: 15 * ONE_MINUTE,
        dataType: 'json',
        remoteURL: this.remoteURL(),
      }
    );
    this.allowedListsLoader.onUpdate(this.updateChecksums.bind(this));

    // Lists of filters currently loaded
    this.lists = new Map();
  }

  remoteURL() {
    return `https://cdn.cliqz.com/adblocking/${platformName}/allowed-lists.json?t=${parseInt(Date.now() / 60 / 60 / 1000, 10)}`;
  }

  stop() {
    this.allowedListsLoader.stop();
  }

  load() {
    return this.allowedListsLoader.load().then(this.updateChecksums.bind(this));
  }

  update() {
    return this.allowedListsLoader.updateFromRemote();
  }

  // Private API

  updateChecksums(allowedLists) {
    // Update URL with current timestamp to play well with caching
    this.allowedListsLoader.resource.remoteURL = this.remoteURL();

    const filtersLists = [];

    Object.keys(allowedLists).forEach(list => {
      Object.keys(allowedLists[list]).forEach(asset => {
        const checksum = allowedLists[list][asset].checksum;
        let lang = null;

        if (list === 'country_lists') {
          lang = allowedLists[list][asset].language;
        }

        const assetName = stripProtocol(asset);
        const filterRemoteURL = BASE_URL + assetName;

        if (lang === null || LANGS.indexOf(lang) > -1) {
          filtersLists.push({
            checksum,
            asset,
            remoteURL: filterRemoteURL,
            key: list,
          });
        }
      });
    });

    return this.updateLists(filtersLists);
  }

  updateLists(filtersLists) {
    const updatedLists = [];

    filtersLists.forEach(newList => {
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
          .then(filters => ({
            asset,
            filters,
            isFiltersList,
            checksum: list.checksum,
          }))
        );
      } else {
        // Retrieve existing list
        const list = this.lists.get(asset);

        // Update the list only if needed (checksum is different)
        if (list.needsToUpdate(checksum)) {
          updatedLists.push(
            list
            .updateFromChecksum(checksum)
            .then(filters => {
              // Ignore any empty list
              if (filters) {
                return {
                  asset,
                  filters,
                  isFiltersList,
                  checksum: list.checksum,
                };
              }
              return undefined;
            })
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
