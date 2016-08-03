"use strict";

import ResourceLoader, { Resource, UpdateCallbackHandler } from "core/resource-loader";

import { log } from "adblocker/utils";
import parseList from "adblocker/filters-parsing";


// Disk persisting
const RESOURCES_PATH = ["antitracking", "adblocking"];


// Common durations
const ONE_SECOND  = 1000;
const ONE_MINUTE  = 60 * ONE_SECOND;
const ONE_HOUR    = 60 * ONE_MINUTE;
const ONE_DAY     = 24 * ONE_HOUR;


// URLs to fetch block lists
const FILTER_LIST_BASE_URL = "https://raw.githubusercontent.com/gorhill/uBlock/master/";
const BASE_URL             = "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/";
const CHECKSUMS_URL        = BASE_URL + "checksums/ublock0.txt?_=";


function urlFromPath(path) {
  if (path.startsWith("assets/ublock/filter-lists.json")) {
    return FILTER_LIST_BASE_URL + path;
  }
  else if (path.startsWith("assets/thirdparties/")) {
    return path.replace(
      /^assets\/thirdparties\//,
      BASE_URL + "thirdparties/");
  }
  else if (path.startsWith("assets/ublock/")) {
    return path.replace(
      /^assets\/ublock\//,
      BASE_URL + "filters/");
  }
}


const ALLOWED_LISTS = new Set([
    // uBlock
    "assets/ublock/filters.txt",
    "assets/ublock/unbreak.txt",
    // Adblock plus
    "assets/thirdparties/easylist-downloads.adblockplus.org/easylist.txt",
    // Extra lists
	  "pgl.yoyo.org/as/serverlist",
    // Anti adblock killers
    "https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt",
    "https://easylist-downloads.adblockplus.org/antiadblockfilters.txt",
    // Privacy
    // "assets/thirdparties/easylist-downloads.adblockplus.org/easyprivacy.txt",
    // "assets/ublock/privacy.txt"
]);


function isListSupported(path) {
  return ALLOWED_LISTS.has(path);
}


class Checksums extends UpdateCallbackHandler {
  constructor() {
    super();

    this._loader = new ResourceLoader(
      RESOURCES_PATH.concat("checksums"),
      {
        cron: ONE_DAY,
        dataType: "plainText",
        remoteURL: this._remoteURL
      }
    );
    this._loader.onUpdate(this._updateChecksums.bind(this));
  }

  load() {
    this._loader.load().then(this._updateChecksums.bind(this));
  }

  // Private API

  get _remoteURL() {
    // The URL should contain a timestamp to avoid caching
    return CHECKSUMS_URL + String(Date.now());
  }

  _updateChecksums(data) {
    // Update the URL as it must include the timestamp to avoid caching
    // NOTE: This mustn't be removed as it would break the update.
    this._loader.resource.remoteURL = this._remoteURL;

    // Parse checksums
    data.split(/\r\n|\r|\n/g)
      .filter(line => line.length > 0)
      .forEach(line => {
        const [checksum, asset] = line.split(" ");

        // Trigger callback even if checksum is the same since
        // it wouldn't work for filter-lists.json file which could
        // have the same checksum but lists could be expired.
        // FiltersList class has then to check the checksum before update.
        this.triggerCallbacks({
          checksum,
          asset,
          remoteURL: urlFromPath(asset)
        });
      });
  }
}


class ExtraLists extends UpdateCallbackHandler {
  constructor() {
    super();

    this._resource  = new Resource(
      RESOURCES_PATH.concat(["assets", "ublock", "filter-lists.json"]),
      { remoteURL: urlFromPath("assets/ublock/filter-lists.json") }
    );
    this._resource.onUpdate(this._updateExtraLists.bind(this));
  }

  load() {
    this._resource.load().then(this._updateExtraLists.bind(this));
  }

  updateExtraLists({asset}) {
    if (asset.endsWith("filter-lists.json")) {
      this._resource.updateFromRemote();
    }
  }

  _updateExtraLists(extraLists) {
    Object.keys(extraLists).forEach(entry => {
      const metadata = extraLists[entry];
      const url = metadata.hasOwnProperty("homeURL") ? metadata["homeURL"] : entry;

      this.triggerCallbacks({
        asset: entry,
        remoteURL: url
      });
    });
  }
}


// TODO: Download the file everytime, but we should find a way to use the checksum
// Or, since some lists use an expiration date, we could store a timestamp instead of checksum
class FiltersList extends UpdateCallbackHandler {
  constructor(checksum, asset, remoteURL) {
    super();
    this.checksum  = checksum;
    this.filters   = [];

    // Strip prefix
    ["http://", "https://"].forEach(prefix => {
      if (asset.startsWith(prefix)) {
        asset = asset.substring(prefix.length);
      }
    });

    this._resource  = new Resource(
      RESOURCES_PATH.concat(asset.split("/")),
      { remoteURL, dataType: "plainText" }
    );
    this._resource.onUpdate(this.updateList.bind(this));
  }

  load() {
    this._resource.load().then(this.updateList.bind(this));
  }

  updateFromChecksum(checksum) {
    if (checksum === undefined || checksum !== this.checksum) {
      this.checksum = checksum;
      this._resource.updateFromRemote();
    }
  }

  updateList(data) {
    this.filters = parseList(data) || [];
    if (this.filters.length > 0) {
      this.triggerCallbacks(this.filters);
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

    // Index of available extra filters lists
    this.extraLists = new ExtraLists();

    // Lists of filters currently loaded
    this.lists = new Map();

    // Update extra lists
    this.checksums.onUpdate(this.extraLists.updateExtraLists.bind(this.extraLists));

    // Register callbacks on list creation
    this.checksums.onUpdate(this.updateList.bind(this));
    this.extraLists.onUpdate(this.updateList.bind(this));
  }

  load() {
    this.extraLists.load();
    this.checksums.load();
  }

  concatLists(lists) {
    let filters = [];
    lists.forEach(list => {
      filters = filters.concat(list.filters);
    });
    return filters;
  }

  updateList({checksum, asset, remoteURL}) {
    if (isListSupported(asset)) {
      let list = this.lists.get(asset);

      if (list === undefined) {
        list = new FiltersList(checksum, asset, remoteURL);
        this.lists.set(asset, list);
        list.onUpdate(() => {
          this.triggerCallbacks(this.concatLists(this.lists));
        });
        list.load();
      } else {
        list.updateFromChecksum(checksum);
      }
    }
  }
}
