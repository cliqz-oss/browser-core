import {
  registerContentScript,
} from '../core/content/helpers';

const MAX_TOP_OFFSET = 250;
const MODULE_NAME = 'myoffrz-helper';

// To collect categories, two kinds of messages will be
// sent from content scripts
// 1. Asking collection (css) rules about a url (domain)
// 2. Send back collected categories

class CategoryHelper {
  constructor(window, backgroundModule) {
    this.window = window;
    this.document = window.document;
    this.backgroundModule = backgroundModule;
    this.categoriesRules = [];
    this.refetchUrl = null;
  }

  onBackgroundMsg(msg) {
    if (msg.module !== MODULE_NAME) {
      // There can be push messages from different modules
      return;
    }

    if (msg.action === 'rulesFromBackground') {
      const payload = msg.args[0];
      this.handleRules(payload);
    }
  }

  sendToBackground({ categories, titles, links, productId, prefix, price }) {
    if (categories.length > 0 || titles.length > 0 || links.length > 0 || this.refetchUrl) {
      this.backgroundModule.action(
        'handleCategories',
        {
          categories,
          titles,
          linkIds: links,
          productId,
          fromContent: true,
          prefix,
          fetchUrl: this.refetchUrl,
          rules: this.categoriesRules,
          price
        }
      );
    }
  }

  extractCategroyFromElement(e, shouldFetch, ignoreHidden) {
    if (!e) {
      return [];
    }
    const separator = new RegExp(`[${String.fromCharCode(8250)}|>|\n]`); // Something looks like a '>'
    const goBack = String.fromCharCode(8249); // Something looks like a '<'

    // the element should be somewhere in the top left part of the page
    if (!ignoreHidden && (e.hidden || e.offsetTop > MAX_TOP_OFFSET)) {
      return [];
    }

    // This is a hack to get Amazon / Ebay category levels
    // e.g. Electronics & Photo › Mobile Phones & Communication › Accessories
    const text = e.textContent.trim();
    // Filter the "go back to search term" (after serach within amazon)
    // we might need to refetch the page with
    if (text.indexOf(goBack) > -1) {
      if (shouldFetch && !this.refetchUrl) {
        this.refetchUrl = document.head.querySelector("link[rel='canonical']").getAttribute('href');
      }
      return [];
    }

    // extract the text
    let categroy = text.split(separator).map(part => part.trim())
      .filter(part => part !== '').join(' > ');
    if (categroy.indexOf('in') === 0) {
      categroy = categroy.slice(3);
    }
    return [categroy];
  }

  getCategories(selector, shouldFetch) {
    const elements = this.document.querySelectorAll(selector);
    let categories = [];
    elements.forEach((element) => {
      categories = categories.concat(
        this.extractCategroyFromElement(element, shouldFetch, false)
      );
    });
    categories = categories.reduce((acc, val) => acc.concat(val), []);
    return [...new Set(categories)];
  }

  getTitles(selector) {
    const titles = [];
    const elements = this.document.querySelectorAll(selector);
    elements.forEach((element) => {
      titles.push(element.textContent.trim());
    });
    return titles;
  }

  getLinks(selector, regex) {
    const links = [];
    const elements = this.document.querySelectorAll(selector);
    elements.forEach((element) => {
      const link = element.href;
      if (regex) {
        const match = (new RegExp(regex)).exec(link);
        if (match) {
          links.push(match[1]);
          return;
        }
      }
      links.push(link);
    });
    return links;
  }

  getPrice(selector) {
    const element = this.document.querySelector(selector);
    const price = element.textContent.trim().match(/[\d,.]+/g);
    if (price && price.length > 0) {
      // always use "." as decimal point
      const parts = price[0].split(/[,.]/);
      if (parts.length > 1 && parts[parts.length - 1].length === 2) {
        parts[parts.length - 1] = `.${parts[parts.length - 1]}`;
      }
      return parts.join('');
    }
    return null;
  }

  handleRules({ rules, productId, prefix }) {
    /* eslint no-param-reassign: off */
    const _handleRules = () => {
      let categories = [];
      let titles = [];
      let links = [];
      let price = null;
      this.categoriesRules = rules.category;
      if (rules.category && rules.category.length > 0) {
        categories = (rules.category).map(rule => this.getCategories(rule, rules.refetch));
        categories = categories.reduce((acc, val) => acc.concat(val), []);
        categories = [...new Set(categories)];
      }
      if (rules.title && rules.title.length > 0) {
        rules.title.forEach((rule) => {
          titles = titles.concat(this.getTitles(rule));
        });
      }
      if (rules.link && rules.link.length > 0) {
        rules.link.forEach((rule) => {
          links = links.concat(this.getLinks(rule, rules.linkIdRegex));
        });
      }
      if (rules.price && rules.price.length > 0) {
        rules.price.some((rule) => {
          price = this.getPrice(rule);
          return !!price;
        });
      }
      // We simply send prefix and productId back as metadata
      this.sendToBackground({ categories, titles, links, productId, prefix, price });
    };
    if (rules) {
      if (rules.waitForLoad && this.document.readyState !== 'complete') {
        // The document is not fully loaded and the rules ask to wait
        // After some testing, most sites work well without wait for `load`
        this.window.addEventListener('load', () => {
          _handleRules();
        });
      } else {
        _handleRules();
      }
    }
  }
}

registerContentScript(MODULE_NAME, 'http*', (window, chrome, CLIQZ) => {
  if (window.top === window) { // We need only top window (no iframes)
    const backgroundModule = CLIQZ.app.modules[MODULE_NAME];
    const categoryHelper = new CategoryHelper(window, backgroundModule);
    const callback = categoryHelper.onBackgroundMsg.bind(categoryHelper);
    chrome.runtime.onMessage.addListener(callback);

    const onUnload = () => {
      chrome.runtime.onMessage.removeListener(callback);
      window.removeEventListener('unload', onUnload);
    };

    window.addEventListener('unload', onUnload);
  }
});
