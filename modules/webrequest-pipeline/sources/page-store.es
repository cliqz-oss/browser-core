import tabs from '../platform/tabs';
import webNavigation from '../platform/webnavigation';
import logger from './logger';


function makeTabContext({ url, incognito }) {
  return {
    url,
    isRedirect: false,
    isPrivate: incognito,
    lastRequestId: -1,
    frames: new Map([[0, {
      parentFrameId: -1,
      url,
    }]]),
  };
}

export default class PageStore {
  constructor() {
    this.tabs = new Map();

    this.onTabCreated = this.onTabCreated.bind(this);
    this.onTabUpdated = this.onTabUpdated.bind(this);
    this.onTabRemoved = this.onTabRemoved.bind(this);
    this.onNavigationCommitted = this.onNavigationCommitted.bind(this);
  }

  init() {
    tabs.onCreated.addListener(this.onTabCreated);
    tabs.onUpdated.addListener(this.onTabUpdated);
    tabs.onRemoved.addListener(this.onTabRemoved);
    if (webNavigation) {
      webNavigation.onCommitted.addListener(this.onNavigationCommitted);
    }
  }

  unload() {
    tabs.onCreated.removeListener(this.onTabCreated);
    tabs.onUpdated.removeListener(this.onTabUpdated);
    tabs.onRemoved.removeListener(this.onTabRemoved);
    if (webNavigation) {
      webNavigation.onCommitted.removeListener(this.onNavigationCommitted);
    }
  }

  /**
   * Create a new `tabContext` for the new tab
   */
  onTabCreated(tab) {
    this.tabs.set(tab.id, makeTabContext(tab));
  }

  /**
   * Update an existing tab or create it if we do not have a context yet.
   */
  onTabUpdated(tabId, info, tab) {
    let tabContext = this.tabs.get(tabId);
    if (tabContext === undefined) {
      tabContext = makeTabContext(tab);
      this.tabs.set(tabId, tabContext);
    }

    // Update `isPrivate` and `url` if available
    tabContext.isPrivate = tab.incognito;
    if (info.url !== undefined) {
      tabContext.url = info.url;
    }
  }

  /**
   * Remove tab context for `tabId`.
   */
  onTabRemoved(tabId) {
    this.tabs.delete(tabId);
  }

  onNavigationCommitted(details) {
    const { frameId, tabId, url } = details;
    if (frameId === 0 && this.tabs.get(tabId) !== url) {
      this.onMainFrame({ tabId, url, requestId: 0 }, 'onBeforeRequest');
    }
  }

  onMainFrame({ tabId, url, requestId }, event) {
    // Update last request id from the tab
    let tabContext = this.tabs.get(tabId);
    if (tabContext === undefined) {
      tabContext = makeTabContext({ url, incognito: null });
      this.tabs.set(tabId, tabContext);
    }

    if (event === 'onBeforeRequest') {
      tabContext.frames.clear();
      // Detect redirect: if the last request on this tab had the same id and
      // this was from the same `onBeforeRequest` hook, we can assume this is a
      // redirection.
      if (tabContext.lastRequestId === requestId) {
        tabContext.isRedirect = true;
      }

      // Only keep track of `lastRequestId` with `onBeforeRequest` listener
      // since we need this information for redirect detection only and this can
      // be detected with this hook.
      tabContext.lastRequestId = requestId;
    }

    // Update context of tab with `url` and main frame information
    tabContext.url = url;
    tabContext.frames.set(0, {
      parentFrameId: -1,
      url,
    });
  }

  onSubFrame(details) {
    const { tabId, frameId, parentFrameId, url } = details;
    const tab = this.tabs.get(tabId);
    if (tab === undefined) {
      logger.log('Could not find tab for sub_frame request', details);
      return;
    }

    // Keep track of frameUrl as well as parent frame
    tab.frames.set(frameId, {
      parentFrameId,
      url,
    });
  }

  isRedirect({ tabId, type }) {
    const tabContext = this.tabs.get(tabId);
    return (
      type === 'main_frame'
      && tabContext !== undefined
      && tabContext.isRedirect
    );
  }

  isPrivateTab(tabId) {
    const tab = this.tabs.get(tabId);
    return tab === undefined ? null : tab.isPrivate;
  }

  getFrameAncestors({ tabId, parentFrameId }) {
    const tab = this.tabs.get(tabId);
    const ancestors = [];

    // Reconstruct frame ancestors
    if (tab !== undefined) {
      let currentFrameId = parentFrameId;
      while (currentFrameId !== -1) {
        const frame = tab.frames.get(currentFrameId);
        ancestors.push({
          frameId: currentFrameId,
          url: frame.url,
        });
        currentFrameId = frame.parentFrameId;
      }
    }

    return ancestors;
  }

  /**
   * Return the URL of the frame.
   */
  getFrameUrl(context) {
    const { tabId, frameId } = context;
    const tab = this.tabs.get(tabId);

    if (tab === undefined) {
      return null;
    }

    const frame = tab.frames.get(frameId);

    // In some cases, frame creation does not trigger a webRequest event (e.g.:
    // if the iframe is specified in the HTML of the page directly). In this
    // case we try to fall-back to something else: documentUrl, originUrl,
    // initiator.
    if (frame === undefined) {
      return context.documentUrl || context.originUrl || context.initiator;
    }

    return frame.url;
  }

  /**
   * Return the URL of top-level document (i.e.: tab URL).
   */
  getTabUrl({ tabId }) {
    const tab = this.tabs.get(tabId);

    if (tab === undefined) {
      return null;
    }

    return tab.url;
  }
}
