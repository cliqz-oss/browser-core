import windowWrapper from '../core/base/window';
import Sidebar from '../core/ui/sidebar';
import config from '../core/config';
import inject from '../core/kord/inject';
import utils from '../core/utils';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

const googleUrl = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query

export default windowWrapper({
  core: inject.module('core'),
  history: inject.module('history'),

  constructor({ window }) {
    const url = `${config.baseURL}serp-sidebar/index.html`;
    this.cssUrl = `${config.baseURL}serp-sidebar/styles/xul.css`;
    this.window = window;
    this.sidebar = new Sidebar({
      url,
      prefix: 'serp-sidebar',
      title: 'Search Sidebar',
      shortcut: 's',
      actions: {
        openLink: utils.openLink.bind(utils, this.window),
      },
    });
    this.resultsCache = new Map();
  },

  init() {
    addStylesheet(this.window.document, this.cssUrl);
    this.sidebar.attach(this.window);
  },

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);
    this.sidebar.close();
    this.sidebar.deattach(this.window);
  },

  events: {
    'core:tab_select': function onTabSelect({ windowId }) {
    },

    'content:location-change': function onTabSelect({ url, triggeringUrl }) {
      this.history.action('getRedirectRootUrl', triggeringUrl).then((redirectRootUrl) => {
        if (!googleUrl.test(redirectRootUrl)) {
          return;
        }
        const results = this.resultsCache.get(redirectRootUrl);
        this.sidebar.open().then(() => {
          this.sidebar.postMessage({
            action: 'render',
            args: [{
              results,
              currentUrl: url,
              serpUrl: redirectRootUrl,
            }],
          });
        });
      });
    },

    'content:load': function onMeta({ url, windowId }) {
      if (!googleUrl.test(url)) {
        return;
      }

      Promise.all([
        this.core.action('queryHTML', url, '#search h3 > a', 'href,innerText'),
        this.core.action('queryHTML', url, '#search h3 + div > div > span', 'innerText'),
      ]).then((res) => {
        if (!res[0]) {
          return;
        }

        const results = res[0].map((r, i) => ({
          url: r.href,
          title: r.innerText,
          description: res[1][i],
        }));

        this.resultsCache.set(url, results)
      });
    }
  },

  actions: {

  },
});
