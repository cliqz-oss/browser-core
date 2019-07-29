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
    this.onBeforeNavigate = this.onBeforeNavigate.bind(this);
    this.onNavigationCommitted = this.onNavigationCommitted.bind(this);
  }

  init() {
    tabs.onCreated.addListener(this.onTabCreated);
    tabs.onUpdated.addListener(this.onTabUpdated);
    tabs.onRemoved.addListener(this.onTabRemoved);
    if (webNavigation) {
      webNavigation.onBeforeNavigate.addListener(this.onBeforeNavigate);
      webNavigation.onCommitted.addListener(this.onNavigationCommitted);
    }
  }

  unload() {
    tabs.onCreated.removeListener(this.onTabCreated);
    tabs.onUpdated.removeListener(this.onTabUpdated);
    tabs.onRemoved.removeListener(this.onTabRemoved);
    if (webNavigation) {
      webNavigation.onBeforeNavigate.removeListener(this.onBeforeNavigate);
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

  onBeforeNavigate(details) {
    const { frameId, tabId, url } = details;
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0 && tabContext) {
      tabContext.navigating = url;
    }
  }

  onNavigationCommitted(details) {
    const { frameId, tabId, url } = details;
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0 && (tabContext !== undefined && tabContext.url !== url)) {
      this.onMainFrame({ tabId, url, requestId: 0 }, 'onBeforeRequest');
    }
    if (tabContext) {
      tabContext.navigating = null;
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

        // If `frame` if undefined, this means we do not have any information
        // about the frame associated with `currentFrameId`. This can happen if
        // the event for `main_frame` or `sub_frame` was not emitted from the
        // webRequest API for this frame; this can happen when Service Workers
        // are used. In this case, we consider that the parent frame is the main
        // frame (which is very likely the case).
        if (frame === undefined) {
          ancestors.push({
            frameId: 0,
            url: tab.url,
          });
          break;
        }

        // Continue going up the ancestors chain
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
  getTabUrl({ tabId, type }) {
    const tab = this.tabs.get(tabId);

    if (tab === undefined) {
      return null;
    }
    // any xmlhttprequest between webnavigation events is a fetch from the service-worker for the
    // destination page, so we return the future tab url, which we saved in `navigating`.
    if (tab.navigating && type === 'xmlhttprequest') {
      return tab.navigating;
    }

    return tab.url;
  }
}
