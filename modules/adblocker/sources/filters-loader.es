import ResourceLoader, { Resource, UpdateCallbackHandler } from 'core/resource-loader';
import CliqzLanguage from 'platform/language';

// Disk persisting
const RESOURCES_PATH = ['antitracking', 'adblocking'];


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;


// URLs to fetch block lists

const BASE_URL = 'https://cdn.cliqz.com/adblocking/latest-filters/';

const LANGS = CliqzLanguage.state();


function stripProtocol(url) {
  let result = url;
  ['http://', 'https://'].forEach(prefix => {
    if (result.startsWith(prefix)) {
      result = result.substring(prefix.length);
    }
  });

  return result;
}


class Checksums extends UpdateCallbackHandler {
  constructor() {
    super();

    this.remoteURL = 'https://cdn.cliqz.com/adblocking/allowed-lists.json';
    this.loader = new ResourceLoader(
      RESOURCES_PATH.concat('checksums'),
      {
        cron: ONE_DAY,
        dataType: 'json',
        remoteURL: this.remoteURL,
      }
    );
    this.loader.onUpdate(this.updateChecksums.bind(this));
  }

  load() {
    this.loader.load().then(this.updateChecksums.bind(this));
  }

  // Private API

  updateChecksums(data) {
    // Parse checksums
    Object.keys(data).forEach(list => {
      Object.keys(data[list]).forEach(asset => {
        const checksum = data[list][asset].checksum;
        let lang = null;
        if (list === 'country_lists') {
          lang = data[list][asset].language;
        }

        const assetName = stripProtocol(asset);

        if (lang === null || LANGS.indexOf(lang) > -1) {
          this.triggerCallbacks({
            checksum,
            asset,
            remoteURL: BASE_URL + assetName,
            key: list,
          });
        }
      });
    });
  }
}


class FiltersList extends UpdateCallbackHandler {
  constructor(checksum, asset, remoteURL) {
    super();
    this.checksum = checksum;

    const assetName = stripProtocol(asset);

    this.resource = new Resource(
      RESOURCES_PATH.concat(assetName.split('/')),
      { remoteURL, dataType: 'plainText' }
    );
    this.resource.onUpdate(this.updateList.bind(this));
  }

  load() {
    this.resource.load().then(this.updateList.bind(this));
  }

  updateFromChecksum(checksum) {
    if (checksum === undefined || checksum !== this.checksum) {
      this.checksum = checksum;
      this.resource.updateFromRemote();
    }
  }

  updateList(data) {
    const filters = data.split(/\r\n|\r|\n/g);
    if (filters.length > 0) {
      this.triggerCallbacks(filters);
    }
  }
}


/* Class responsible for loading, persisting and updating filters lists.
 */
export default class extends UpdateCallbackHandler {

  constructor() {
    super();

    // Current checksums of official filters lists
    this.checksums = new Checksums();


    // Lists of filters currently loaded
    this.lists = new Map();


    // Register callbacks on list creation
    this.checksums.onUpdate(this.updateList.bind(this));
  }

  load() {
    this.checksums.load();
  }

  updateList({ checksum, asset, remoteURL, key }) {
    let list = this.lists.get(asset);

    if (list === undefined) {
      list = new FiltersList(checksum, asset, remoteURL);
      this.lists.set(asset, list);
      list.onUpdate(filters => {
        const isFiltersList = key !== 'js_resources';
        this.triggerCallbacks({ asset, filters, isFiltersList });
      });
      list.load();
    } else {
      list.updateFromChecksum(checksum);
    }
  }
}
