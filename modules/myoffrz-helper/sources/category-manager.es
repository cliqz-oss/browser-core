import ResourceLoader from '../core/resource-loader';
import Adblocker from '../platform/lib/adblocker';
import config from '../core/config';
import CachedMap from '../core/persistence/cached-map';
import logger from './logger';
import pacemaker from '../core/services/pacemaker';
import { parse } from '../core/tlds';

// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

export default class ContentCategoryManager {
  constructor() {
    this.cache = {};
    this.storage = new CachedMap('category');
    this.filtersData = {};

    this.engine = null;
    this.id2pattern = new Map();
    this.resetEngine();

    this.loader = new ResourceLoader(
      ['myoffrz-helper', 'category-pattern.json'],
      {
        cron: 24 * ONE_HOUR,
        updateInterval: 30 * ONE_MINUTE,
        dataType: 'json',
        remoteURL: `${config.settings.CDN_BASEURL}/offers/category/category-pattern.json`
      }
    );
  }

  resetEngine(raw = '') {
    const filters = Adblocker.parseFilters(raw, { debug: true }).networkFilters;

    // Initialize mapping from filter id to original pattern
    this.id2pattern = new Map(filters.map(filter => [filter.getId(), filter.rawLine]));

    // Remove original pattern which will be kept in `this.id2pattern` instead.
    filters.forEach((filter) => { filter.rawLine = undefined; });

    // Reset engine with new filters
    this.engine = new Adblocker.FiltersEngine({
      networkFilters: filters,
      loadCosmeticFilters: false,
      // We currently disable the optimizations since this module relies on the fact
      // that original filters can always be retrieved if there is a match.
      // Moreover, the number of filters is very small so this should not make any
      // difference.
      enableOptimizations: false,
    });
  }

  async init() {
    this.loader.onUpdate(this.updatePatterns.bind(this));
    const filtersData = await this.loader.load();
    this.updatePatterns(filtersData);
    await this.storage.init();
    this.cache = this.storage.get('cache') || {};
    this.clearCacheInterval = pacemaker.everyHour(this.clearCache.bind(this));
  }

  async unload() {
    this.loader.stop();
    await this.storage.set('cache', this.cache);
    this.storage.unload();

    pacemaker.clearTimeout(this.clearCacheInterval);
    this.clearCacheInterval = null;
  }

  clearCache() {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (now - this.cache[key].ts > 7 * ONE_DAY) {
        delete this.cache[key];
      }
    });
    return this.storage.set('cache', this.cache);
  }

  getRules(url) {
    logger.debug(`check rules for ${url}`);
    const result = { styles: null, productId: null };
    const match = this.engine.match(Adblocker.makeRequest(
      { url, type: 2, sourceUrl: url },
      parse,
    ));
    if (match.match) {
      // Get the matching filter
      const filterData = this.filtersData[this.id2pattern.get(match.filter.getId())];
      logger.log(`found rules for ${url}`, match.filter, filterData);
      if (filterData) {
        // Check if there is a regex to extract the product id,
        // it will be used later for caching, page refetch
        const { patterns, productIdRegex, prefix } = filterData;
        if (productIdRegex) {
          const matchId = (new RegExp(productIdRegex)).exec(url);
          if (matchId) {
            // The productIdRegex should always have a matching group
            const productId = matchId[1];
            logger.debug(`product id is ${productId}`);
            result.productId = productId;
            // Check if the productId is already cached,
            // if yes, we don't need to ask content script
            if (productId in this.cache) {
              const categories = this.cache[productId].value;
              return { ...result, categories, prefix };
            }
          }
        }
        // Attached the cosmetic filters
        return { ...result, styles: patterns, prefix };
      }
    }
    return result;
  }

  getCategory({ titles, linkIds }) {
    let categories = [];
    if (titles) {
      /* eslint no-param-reassign: off */
      linkIds = linkIds.concat(
        titles.map((title) => {
          let id = (this.cache[title] || {}).value;
          if (!id && title.indexOf(',') > -1) {
            // Try to get rid of color, size ...
            // TODO: add some fuzzy matching here
            id = (this.cache[title.split(',')[0]] || {}).value;
          }
          return id;
        }).filter(id => id !== null || id !== undefined)
      );
    }
    linkIds.forEach((id) => {
      categories = categories.concat((this.cache[id] || { value: [] }).value);
    });
    return categories;
  }

  updatePatterns(filtersData) {
    this.resetEngine(Object.keys(filtersData).join('\n'));
    this.filtersData = filtersData;
  }

  cacheCategories({ categories, titles, productId /* , url */ }) {
    // TODO: Prefix with hostname to eleminiate potential collision
    if (productId && categories.length > 0) {
      this.cache[productId] = {
        value: categories,
        ts: Date.now()
      };
    }
    if (titles.length === 1) {
      this.cache[titles[0]] = {
        value: productId,
        ts: Date.now()
      };
    }
    return this.storage.set('cache', this.cache);
  }
}
