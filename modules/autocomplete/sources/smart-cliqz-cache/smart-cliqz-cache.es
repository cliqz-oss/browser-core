import { getSmartCliqz } from 'autocomplete/smart-cliqz-cache/rich-header'
import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import Cache from 'autocomplete/smart-cliqz-cache/cache';

const CUSTOM_DATA_CACHE_FOLDER = 'cliqz';
const CUSTOM_DATA_CACHE_FILE = CUSTOM_DATA_CACHE_FOLDER + '/smartcliqz-custom-data-cache.json';
// maximum number of items (e.g., categories or links) to keep
const MAX_ITEMS = 5;

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

/*
 * @namespace smart-cliqz-cache
 */
export default class {
  /**
  * This module caches SmartCliqz results in the extension. It
  * also customizes news SmartCliqz by re-ordering categories and
  * links based on the user's browsing history.
  * @class SmartCliqzCache
  * @constructor
  */
  constructor() {
    this._smartCliqzCache = new Cache(ONE_MINUTE);
    // re-customize after an hour
    this._customDataCache = new Cache(ONE_HOUR);
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

  /*
  * stores SmartCliqz if newer than chached version
  * @method store
  * @param smartCliqz
  */
  store(smartCliqz) {
    const url = this.getUrl(smartCliqz);

    this._smartCliqzCache.store(url, smartCliqz);

    try {
      if (this.isCustomizationEnabled() &&
         this.isNews(smartCliqz) &&
         this._customDataCache.isStale(url)) {

        this._log('store: found stale data for url ' + url);
        this._prepareCustomData(url);
      }
    } catch (e) {
      this._log('store: error while customizing data: ' + e);
    }
  }
  /**
  * @method fetchAndStore
  * @param id
  */
  fetchAndStore(url) {
    if (this._fetchLock.hasOwnProperty(url)) {
      this._log('fetchAndStore: fetching already in progress for ' + url);
      return;
    }

    this._log('fetchAndStore: for ' + url);
    this._fetchLock[url] = true;
    getSmartCliqz(url).then((smartCliqz) => {
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
      delete this._fetchLock[url];
    }, (e) => {
      this._log('fetchAndStore: error while fetching data: ' +
                 e.type + ' ' + e.message);
      delete this._fetchLock[url];
    });
  }

  /**
  * customizes SmartCliqz if news or domain supported, and user preference is set
  * @method retrieve
  * @param url
  * @returns SmartCliqz from cache (false if not found)
  */
  retrieve(url) {
    const smartCliqz = this._smartCliqzCache.retrieve(url);

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

  /**
   * Same as `retrieve`, but triggers asynchronous cache update:
   * fetches SmartCliqz (again) if not yet cached or if stale. If SmartCliqz
   * was not yet cached `false` is returned and update is initiated.
   * @param {String} url - The SmartCliqz trigger URL
   * @return {SmartCliqz} The cached SmartCliqz or false if not yet cached.
   */
  retrieveAndUpdate(url) {
    const smartCliqz = this.retrieve(url);

    if (this._smartCliqzCache.isStale(url)) {
      utils.setTimeout(function () {
        this.fetchAndStore(url);
      }.bind(this), 0);
    }

    return smartCliqz;
  }

  /**
  * extracts domain from SmartCliqz
  * @method getDomain
  * @param smartCliqz
  */
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

  /**
  * extracts id from SmartCliqz
  * @method getId
  * @param smartCliqz
  */
  getId(smartCliqz) {
    return smartCliqz.data.subType.id;
  }

  /**
  * extracts URL from SmartCliqz
  * @method getUrl
  * @param smartCliqz
  */
  getUrl(smartCliqz) {
    return utils.generalizeUrl(smartCliqz.val, true);
  }

  /**
  * extracts timestamp from SmartCliqz
  * @method getTimestamp
  * @param smartCliqz
  */
  getTimestamp(smartCliqz) {
    return smartCliqz.data.ts;
  }
  /**
  * @method isNews
  * @param smartCliqz
  * returns true this is a news SmartCliqz
  */
  isNews(smartCliqz) {
    return (typeof smartCliqz.data.news !== 'undefined');
  }

  /**
  * @method isCustomizationEnabled
  * @returns true if the user enabled customization
  */
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
    const url = this.getUrl(smartCliqz);
    if (this._customDataCache.isCached(url)) {
      this._injectCustomData(smartCliqz, this._customDataCache.retrieve(url));

      if (this._customDataCache.isStale(url)) {
        this._log('_customizeSmartCliqz: found stale data for ' + url);
        this._prepareCustomData(url);
      }
    } else {
      this._log('_customizeSmartCliqz: custom data not yet ready for ' + url);
    }
  }

  // replaces all keys from custom data in SmartCliqz data
  _injectCustomData(smartCliqz, customData) {
    const url = this.getUrl(smartCliqz);
    this._log('_injectCustomData: injecting for ' + url);
    for (let key in customData) {
      if (customData.hasOwnProperty(key)) {
        smartCliqz.data[key] = customData[key];
        this._log('_injectCustomData: injecting key ' + key);
      }
    }
    this._log('_injectCustomData: done injecting for ' + url);
  }

  // prepares and stores custom data for SmartCliqz with given URL (async.),
  // (if custom data has not been prepared before and has not expired)
  _prepareCustomData(url) {
    if (this._customDataCache.isStale(url)) {
      // update time so that this method is not executed multiple
      // times while not yet finished (runs asynchronously)
      this._customDataCache.refresh(url);
      this._log('_prepareCustomData: preparing for ' + url);
    } else {
      this._log('_prepareCustomData: already updated or in update progress ' + url);
      return;
    }

    // for stats
    const oldCustomData = this._customDataCache.retrieve(url);

    // (1) fetch template from rich header
    getSmartCliqz(url)
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
        this._sendStats(oldCategories, categories, oldCustomData ? true : false, urls);

        // TODO: define per SmartCliqz what the data field to be customized is called
        if (this.isNews(smartCliqz)) {
          this._customDataCache.store(url, { categories: categories });
        } else {
          this._customDataCache.store(url, { links: categories });
        }

        this._log('_prepareCustomData: done preparing for ' + url);
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

  _sendStats(oldCategories, newCategories, isRepeatedCustomization, urls) {
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
}
