import background from '../core/base/background';
import ContentCategoryManager from './category-manager';
import logger from './logger';
import inject from '../core/kord/inject';
import LRU from '../core/LRU';

export default background({
  offersModule: inject.module('offers-v2'),
  core: inject.module('core'),
  pageCache: new LRU(10),

  requiresServices: ['pacemaker'],

  async init() {
    this.contentCategoryManager = new ContentCategoryManager();
    await this.contentCategoryManager.init();
  },

  unload() {
    this.contentCategoryManager.unload();
  },

  events: {
    'content:dom-ready': function onDomReady(url, sender) {
      // Now the page is almost ready, check if we need to push a message
      // to extract the category info from the page content
      logger.debug(`Encounter url ${url}`);
      /** type RuleApplication2 */
      const { payload } = this.actions.getRules({ url });
      logger.debug('payload from getRules', payload);
      if (payload.categories) {
        logger.debug('Found categories from cache', url, payload);
        // We have category information from cache,
        // no need to ask content script
        this.actions.handleCategories(
          { categories: payload.categories, fromContent: false },
          { url }
        );
        return;
      }
      if (payload.rules) {
        logger.debug(`Send rules to page ${url}`, payload.rules);
        this.core.action(
          'callContentAction',
          'myoffrz-helper',
          'rulesFromBackground',
          { windowId: sender.tab.id },
          payload,
        );
        // execution continues:
        // - in the content script, then
        // - in `this.actions.handleCategories`
      }
    },
  },

  actions: {
    /**
     * @returns { payload: RuleApplication2 }
     */
    getRules({ url }) {
      const { styles, productId, categories, prefix } = this.contentCategoryManager.getRules(url);
      const payload = {
        productId,
        categories,
        prefix,
        rules: styles,
      };
      return { payload };
    },

    /**
     * @param categories {string[]}
     * @param fromContent {boolean}
     * @param titles {string}
     * @param linkIds {string[]}
     * @param productId {string}
     * @param prefix {string}
     * @param fetchUrl {string}
     * @param rules
     * @param price
     * @param sender
     */
    async handleCategories(
      { categories, fromContent, titles, linkIds, productId, prefix, fetchUrl, rules, price },
      sender
    ) {
      /* eslint no-param-reassign: off */
      logger.debug('handleCategories', categories, fromContent, titles, linkIds, productId, sender.url);
      if (fetchUrl && fromContent && (!categories || categories.length === 0) && rules) {
        logger.warn(`Categories where not found in the page ${sender.url}`);
      }
      if (fromContent) {
        logger.log(`Extracted from page ${sender.url}`, categories, titles, linkIds);
        if (categories.length === 0) {
          // Try to find categories from cache using title and id
          categories = this.contentCategoryManager.getCategory({ titles, linkIds });
          logger.debug('Getting categories from cache', categories);
        } else if (productId) {
          logger.debug('Caching result');
          this.contentCategoryManager.cacheCategories({
            categories, titles, productId, url: sender.url
          });
        }
        // TODO: Send back the collected categories
        if (sender.tab && sender.tab.id) {
          this.pageCache.set(sender.tab.id, { categories, price });
        }
      }
      if (categories.length > 0) {
        // Now that we have categories, we can try to trigger a match,
        // `prefix` is used to distinguish different stages (basket, checkout, etc)
        this.offersModule.action('onContentCategories', { categories, prefix, url: sender.url });
      }
    },

    getPageCache(sender) {
      return this.pageCache.get(sender.tab.id) || {};
    }
  }
});
