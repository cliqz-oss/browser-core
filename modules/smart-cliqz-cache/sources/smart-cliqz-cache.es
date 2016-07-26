import { getSmartCliqz } from 'smart-cliqz-cache/rich-header'
import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import Cache from 'smart-cliqz-cache/cache';

const SMART_CLIQZ_ENDPOINT = 'http://newbeta.cliqz.com/api/v1/rich-header?path=/id_to_snippet&q=';
const CUSTOM_DATA_CACHE_FOLDER = 'cliqz';
const CUSTOM_DATA_CACHE_FILE = CUSTOM_DATA_CACHE_FOLDER + '/smartcliqz-custom-data-cache.json';
// maximum number of items (e.g., categories or links) to keep
const MAX_ITEMS = 5;

/*
 * This module caches SmartCliqz results in the extension. It
 * also customizes news SmartCliqz by re-ordering categories and\
 * links based on the user's browsing history.
 *
 */
export default class {
  constructor() {
    this._smartCliqzCache = new Cache();
    // re-customize after an hour
    this._customDataCache = new Cache(3600);
    this._isCustomizationEnabledByDefault = true;
    this._isInitialized = false;
    // to prevent fetching while fetching is still in progress
    this._fetchLock = {};

    mkdir(CUSTOM_DATA_CACHE_FOLDER).then(() => {
      // TODO: detect when loaded; allow save only afterwards
      this._customDataCache.load(CUSTOM_DATA_CACHE_FILE);
    }).catch((e) => {
      this._log('init: unable to create cache folder:' + e);
    });

    this._isInitialized = true;
    this._log('init: initialized');
  }

  // stores SmartCliqz if newer than chached version
  store(smartCliqz) {
    const id = this.getId(smartCliqz);

    this._smartCliqzCache.store(id, smartCliqz,
      this.getTimestamp(smartCliqz));

    try {
      if (this.isCustomizationEnabled() &&
         this.isNews(smartCliqz) &&
         this._customDataCache.isStale(id)) {

        this._log('store: found stale data for id ' + id);
        this._prepareCustomData(id);
      }
    } catch (e) {
      this._log('store: error while customizing data: ' + e);
    }
  }

  fetchAndStore(id) {
    if (this._fetchLock.hasOwnProperty(id)) {
      this._log('fetchAndStore: fetching already in progress for id ' + id);
      return;
    }

    this._log('fetchAndStore: for id ' + id);
    this._fetchLock[id] = true;
    getSmartCliqz(id).then((smartCliqz) => {
      // limit number of categories/links
      if (smartCliqz.hasOwnProperty('data')) {
        if (smartCliqz.data.hasOwnProperty('links')) {
          smartCliqz.data.links = smartCliqz.data.links.slice(0, MAX_ITEMS);
        }
        if (smartCliqz.data.hasOwnProperty('categories')) {
          smartCliqz.data.categories = smartCliqz.data.categories.slice(0, MAX_ITEMS);
        }
      }
      this.store(smartCliqz);
      delete this._fetchLock[id];
    }, (e) => {
      this._log('fetchAndStore: error while fetching data: ' +
                 e.type + ' ' + e.message);
      delete this._fetchLock[id];
    });
  }

  // returns SmartCliqz from cache (false if not found);
  // customizes SmartCliqz if news or domain supported, and user preference is set
  retrieve(id) {
    const smartCliqz = this._smartCliqzCache.retrieve(id);

    if (this.isCustomizationEnabled() && smartCliqz &&
      this.isNews(smartCliqz)) {
      try {
        this._customizeSmartCliqz(smartCliqz);
      } catch (e) {
        this._log('retrieveCustomized: error while customizing data: ' + e);
      }
    }
    return smartCliqz;
  }

  // extracts domain from SmartCliqz
  getDomain(smartCliqz) {
    // TODO: define one place to store domain
    if (smartCliqz.data.domain) {
      return smartCliqz.data.domain;
    } else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
      return utils.generalizeUrl(smartCliqz.data.trigger_urls[0]);
    } else {
      return false;
    }
  }

  // extracts id from SmartCliqz
  getId(smartCliqz) {
    return smartCliqz.data.__subType__.id;
  }

  // extracts timestamp from SmartCliqz
  getTimestamp(smartCliqz) {
    return smartCliqz.data.ts;
  }

  // returns true this is a news SmartCliqz
  isNews(smartCliqz) {
    return (typeof smartCliqz.data.news !== 'undefined');
  }

  // returns true if the user enabled customization
  isCustomizationEnabled() {
    try {
      const isEnabled = utils.getPref('enableSmartCliqzCustomization', undefined);
      return isEnabled === undefined ?
        this._isCustomizationEnabledByDefault : isEnabled;
    } catch(e) {
        return this._isCustomizationEnabledByDefault;
    }
  }

  // re-orders categories based on visit frequency
  _customizeSmartCliqz(smartCliqz) {
    const id = this.getId(smartCliqz);
    if (this._customDataCache.isCached(id)) {
      this._injectCustomData(smartCliqz, this._customDataCache.retrieve(id));

      if (this._customDataCache.isStale(id)) {
        this._log('_customizeSmartCliqz: found stale data for ' + id);
        this._prepareCustomData(id);
      }
    } else {
      this._log('_customizeSmartCliqz: custom data not yet ready for ' + id);
    }
  }

  // replaces all keys from custom data in SmartCliqz data
  _injectCustomData(smartCliqz, customData) {
    const id = this.getId(smartCliqz);
    this._log('_injectCustomData: injecting for id ' + id);
    for (let key in customData) {
      if (customData.hasOwnProperty(key)) {
        smartCliqz.data[key] = customData[key];
        this._log('_injectCustomData: injecting key ' + key);
      }
    }
    this._log('_injectCustomData: done injecting for id ' + id);
  }

  // prepares and stores custom data for SmartCliqz with given id (async.),
  // (if custom data has not been prepared before and has not expired)
  _prepareCustomData(id) {
    if (this._customDataCache.isStale(id)) {
      // update time so that this method is not executed multiple
      // times while not yet finished (runs asynchronously)
      this._customDataCache.refresh(id);
      this._log('_prepareCustomData: preparing for id ' + id);
    } else {
      this._log('_prepareCustomData: already updated or in update progress ' + id);
      return;
    }

    // for stats
    const oldCustomData = this._customDataCache.retrieve(id);

    // (1) fetch template from rich header
    getSmartCliqz(id)
      .then((smartCliqz) => {
        const domain = this.getDomain(smartCliqz);
        return Promise.all([Promise.resolve(smartCliqz), this._fetchVisitedUrls(domain)]);
      })
      // (2) fetch history for SmartCliqz domain
      .then(([smartCliqz, urls]) => {
        // now, (3) re-order template categories based on history
        const domain = this.getDomain(smartCliqz);

        // TODO: define per SmartCliqz what the data field to be customized is called
        if (!this.isNews(smartCliqz)) {
          smartCliqz.data.categories = smartCliqz.data.links;
        }

        let categories = smartCliqz.data.categories.slice();

        // add some information to facilitate re-ordering
        for (let j = 0; j < categories.length; j++) {
          categories[j].genUrl = utils.generalizeUrl(categories[j].url);
          categories[j].matchCount = 0;
          categories[j].originalOrder = j;
        }

        // count category-visit matches (visit url contains category url)
        for (let i = 0; i < urls.length; i++) {
          const url = utils.generalizeUrl(urls[i]);
          for (let j = 0; j < categories.length; j++) {
            if (this._isMatch(url, categories[j].genUrl)) {
              categories[j].matchCount++;
            }
          }
        }

        // re-order by match count; on tie use original order
        categories.sort(function compare(a, b) {
          if (a.matchCount !== b.matchCount) {
              return b.matchCount - a.matchCount; // descending
          } else {
              return a.originalOrder - b.originalOrder; // ascending
          }
        });

        categories = categories.slice(0, MAX_ITEMS);

        let oldCategories = oldCustomData ?
          // previous customization: use either categories (news) or links (other SmartCliqz)
          (this.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links) :
          // no previous customization: use default order
          smartCliqz.data.categories;

        // send some stats
        this._sendStats(id, oldCategories, categories, oldCustomData ? true : false, urls);

        // TODO: define per SmartCliqz what the data field to be customized is called
        if (this.isNews(smartCliqz)) {
          this._customDataCache.store(id, { categories: categories });
        } else {
          this._customDataCache.store(id, { links: categories });
        }

        this._log('_prepareCustomData: done preparing for id ' + id);
        this._customDataCache.save(CUSTOM_DATA_CACHE_FILE);
      })
      .catch(e => this._log('_prepareCustomData: error while fetching data: ' + e.message));
  }

  // checks if URL from history matches a category URL
  _isMatch(historyUrl, categoryUrl) {
    // TODO: check for subcategories, for example,
    //       Spiegel 'Soziales' has URL 'wirtschaft/soziales',
    //     thus such entries are counted twice, for 'Sozialez',
    //     but also for 'Wirtschaft'
    return historyUrl.indexOf(categoryUrl) > -1;
  }

  // from history, fetches all visits to given domain within 30 days from now (async.)
  _fetchVisitedUrls(domain) {
    return new Promise((resolve, reject) => {
      this._log('_fetchVisitedUrls: start fetching for domain ' + domain);
      // TODO: make cross platform
      const historyService = Components
        .classes['@mozilla.org/browser/nav-history-service;1']
        .getService(Components.interfaces.nsINavHistoryService);

      if (!historyService) {
        reject('_fetchVisitedUrls: history service not available');
      } else {
        const options = historyService.getNewQueryOptions();
        const query = historyService.getNewQuery();
        query.domain = domain;
        // 30 days from now
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        const result = historyService.executeQuery(query, options);
        const container = result.root;
        container.containerOpen = true;

        let urls = [];
        for (let i = 0; i < container.childCount; i ++) {
          urls[i] = container.getChild(i).uri;
        }

        this._log(
            '_fetchVisitedUrls: done fetching ' +  urls.length +
            ' URLs for domain ' + domain);
        resolve(urls);
      }
    });
  }

  _sendStats(id, oldCategories, newCategories, isRepeatedCustomization, urls) {
    const stats = {
      type: 'activity',
      action: 'smart_cliqz_customization',
      // SmartCliqz id
      id: 'na',
      // total number of URLs retrieved from history
      urlCandidateCount: urls.length,
      // number of URLs that produced a match within shown categories (currently 5)
      urlMatchCount: 0,
      // average number of URL matches across shown categories
      urlMatchCountAvg: 0,
      // standard deviation of URL matches across shown categories
      urlMatchCountSd: 0,
      // number of categories that changed (per position; swap counts twice)
      categoriesPosChangeCount: 0,
      // number of categories kept after re-ordering (positions might change)
      categoriesKeptCount: 0,
      // average position change of a kept categories
      categoriesKeptPosChangeAvg: 0,
      // true, if this customization is a re-customization
      isRepeatedCustomization: isRepeatedCustomization
    };

    let oldPositions = { };
    const length = Math.min(oldCategories.length, newCategories.length);

    for (let i = 0; i < length; i++) {
      stats.urlMatchCount += newCategories[i].matchCount;
      oldPositions[oldCategories[i].title] = i;

      if (newCategories[i].title !== oldCategories[i].title) {
        stats.categoriesPosChangeCount++;
      }
    }
    stats.urlMatchCountAvg = stats.urlMatchCount / length;

    for (let i = 0; i < length; i++) {
      stats.urlMatchCountSd +=
        Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
    }
    stats.urlMatchCountSd /= length;
    stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

    for (let i = 0; i < length; i++) {
      if (oldPositions.hasOwnProperty(newCategories[i].title)) {
        stats.categoriesKeptCount++;
        stats.categoriesKeptPosChangeAvg +=
          Math.abs(i - oldPositions[newCategories[i].title]);

      }
    }
    stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

    utils.telemetry(stats);
  }

  // log helper
  _log(msg) {
    utils.log(msg, 'smart-cliqz-cache');
  }

  unload() {
  }
}
