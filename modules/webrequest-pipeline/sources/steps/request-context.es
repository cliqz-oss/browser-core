import HttpRequestContext from '../webrequest-context';
import { URLInfo } from '../../antitracking/url';
import PageStore from '../page-store';

import tabs from '../../platform/tabs';
import windows from '../../platform/windows';


export default class {
  constructor() {
    this.pageStore = new PageStore();

    tabs.onCreated.addListener(this.pageStore.onTabCreated);
    tabs.onUpdated.addListener(this.pageStore.onTabUpdated);
    tabs.onRemoved.addListener(this.pageStore.onTabRemoved);

    windows.onCreated.addListener(this.pageStore.onWindowCreated);
    windows.onRemoved.addListener(this.pageStore.onWindowRemoved);
  }

  unload() {
    tabs.onCreated.removeListener(this.pageStore.onTabCreated);
    tabs.onUpdated.removeListener(this.pageStore.onTabUpdated);
    tabs.onRemoved.removeListener(this.pageStore.onTabRemoved);

    windows.onCreated.removeListener(this.pageStore.onWindowCreated);
    windows.onRemoved.removeListener(this.pageStore.onWindowRemoved);
  }

  execute(state) {
    /* eslint-disable no-param-reassign */

    // set responseStatus for web-ext
    if (state.statusCode && !state.responseStatus) {
      state.responseStatus = state.statusCode;
    }

    if (state.isPrivate === null || state.isPrivate === undefined) {
      const tabId = state.tabId;
      if (tabId !== -1 && this.pageStore.tabs[tabId]) {
        state.isPrivate = this.pageStore.tabs[tabId].isPrivate;
      }
    }

    const requestContext = new HttpRequestContext(state);
    const url = requestContext.url;

    // stop if no valid url
    if (!url || url === '') return false;

    const urlParts = URLInfo.get(url);

    state.requestContext = requestContext;
    state.url = url;
    state.urlParts = urlParts;

    let sourceUrl = requestContext.getSourceURL();
    try {
      if (!sourceUrl && chrome && chrome.tabs) {
        sourceUrl = this.pageStore.getSourceURL(state);
      }
    } catch (ex) {
      /* Not defined on firefox yet */
    }
    state.sourceUrl = sourceUrl;
    state.sourceUrlParts = URLInfo.get(sourceUrl);

    // Find content type
    state.cpt = state.type;
    if (!state.cpt) {
      state.cpt = requestContext.getContentPolicyType();
    }

    // Tag redirects
    state.isRedirect = this.pageStore.isRedirect(state);

    if (requestContext.isFullPage()) {
      this.pageStore.onFullPage(state);
    }

    if (!state.sourceUrlParts || !state.urlParts) return false;

    return true;
  }
}
