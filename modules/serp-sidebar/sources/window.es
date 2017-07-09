import windowWrapper from '../core/base/window';
import Sidebar from '../core/ui/sidebar';
import config from '../core/config';
import inject from '../core/kord/inject';
import utils from '../core/utils';

const googleUrl = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query

export default windowWrapper({
  core: inject.module('core'),
  history: inject.module('history'),

  constructor({ window }) {
    const url = `${config.baseURL}serp-sidebar/index.html`;
    this.window = window;
    this.sidebar = new Sidebar({
      url,
      prefix: 'serp-sidebar',
      title: 'Search Sidebar',
      shortcut: 's',
      actions: {
        openLink: utils.openLink.bind(utils, this.window)
      }
    });
    this.resultsCache = new Map();
  },

  init() {
    this.sidebar.attach(this.window);
  },

  unload() {
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
            }],
          });
        });
      });
    },

    'content:load': function onMeta({ url, windowId }) {
      if (!googleUrl.test(url)) {
        return;
      }
      this.core.action('queryHTML', url, '#search h3 > a', 'href,innerText')
        .then(results => {
          if (!results) {
            return;
          }

          this.resultsCache.set(url, results.map(r => ({
            url: r.href,
            title: r.innerText,
          })));
        });
    }
  },

  actions: {

  },
});
