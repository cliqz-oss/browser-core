import background from '../core/base/background';
import ContentCategoryManager from './category-manager';
import logger from './logger';
import inject from '../core/kord/inject';
import LRU from '../core/LRU';
import getDocument from '../platform/myoffrz-helper/document';

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
      // to extract the cateogry info from the page content
      logger.debug(`Encounter url ${url}`);
      const { payload } = this.actions.getRules({ url });
      logger.debug('payload from getRules', payload);
      if (payload.categories) {
        logger.debug('Found cateories from cache', url, payload);
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
          'broadcastActionToWindow',
          sender.tab.id,
          'myoffrz-helper',
          'rulesFromBackground',
          payload,
        );
      }
    },
  },

  extractCategroyFromElement(e) {
    if (!e) {
      return [];
    }

    const separator = new RegExp(`[${String.fromCharCode(8250)}|>|\n]`); // Something looks like a '>'
    const goBack = String.fromCharCode(8249); // Something looks like a '<'
    const text = e.textContent.trim();
    // Should not happen since we're refetching the page
    if (text.indexOf(goBack) > -1) {
      logger.warn('Unexpected symbol in page refetch');
      return [];
    }
    let categroy = text.split(separator).map(part => part.trim()).filter(part => part !== '').join(' > ');
    if (categroy.startsWith('in ')) {
      categroy = categroy.slice(3);
    }
    return [categroy];
  },

  actions: {
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

    async handleCategories(
      { categories, fromContent, titles, linkIds, productId, prefix, fetchUrl, rules, price },
      sender
    ) {
      /* eslint no-param-reassign: off */
      logger.debug('handleCategories', categories, fromContent, titles, linkIds, productId, sender.url);
      if (fetchUrl && fromContent && (!categories || categories.length === 0) && rules) {
        // No categories from the page and Content script message provides a refetch url
        const fetchedDom = getDocument().createHTMLDocument('New Document').createElement('html');

        const resp = await fetch(fetchUrl);
        fetchedDom.innerHTML = await resp.text();
        await Promise.all(rules.map(async (rule) => {
          const newEl = fetchedDom.querySelector(rule);
          const newCategories = await this.extractCategroyFromElement(newEl);
          categories = categories.concat(newCategories);
        }));

        categories = [...new Set(categories)];
        logger.debug('Categoires after refetch', categories);
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
