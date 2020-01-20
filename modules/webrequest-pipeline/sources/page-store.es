/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import tabs from '../platform/tabs';
import windows from '../platform/windows';
import webNavigation from '../platform/webnavigation';
import events from '../core/events';
import logger from './logger';
import Page, { PAGE_LOADING_STATE } from './page';

function makeTabContext(tab) {
  return new Page(tab);
}

export default class PageStore {
  constructor() {
    this.tabs = new Map();
    this.staged = [];
  }

  init() {
    tabs.onCreated.addListener(this.onTabCreated);
    tabs.onUpdated.addListener(this.onTabUpdated);
    tabs.onRemoved.addListener(this.onTabRemoved);
    tabs.onActivated.addListener(this.onTabActivated);
    webNavigation.onBeforeNavigate.addListener(this.onBeforeNavigate);
    webNavigation.onCommitted.addListener(this.onNavigationCommitted);
    webNavigation.onDOMContentLoaded.addListener(this.onNavigationLoaded);
    webNavigation.onCompleted.addListener(this.onNavigationComplete);
    if (windows && windows.onFocusChanged) {
      windows.onFocusChanged.addListener(this.onWindowFocusChanged);
    }
    // popupate initially open tabs
    tabs.query({}, (openTabs) => {
      openTabs.forEach((tab) => {
        this.onTabCreated(tab);
      });
    });
  }

  unload() {
    this.tabs.forEach(page => this.stagePage(page));
    this.tabs.clear();

    tabs.onCreated.removeListener(this.onTabCreated);
    tabs.onUpdated.removeListener(this.onTabUpdated);
    tabs.onRemoved.removeListener(this.onTabRemoved);
    tabs.onActivated.removeListener(this.onTabActivated);
    webNavigation.onBeforeNavigate.removeListener(this.onBeforeNavigate);
    webNavigation.onCommitted.removeListener(this.onNavigationCommitted);
    webNavigation.onDOMContentLoaded.removeListener(this.onNavigationLoaded);
    webNavigation.onCompleted.removeListener(this.onNavigationComplete);
    if (windows && windows.onFocusChanged) {
      windows.onFocusChanged.removeListener(this.onWindowFocusChanged);
    }
  }

  stagePage(page) {
    if (this.staged.push(page) > 5) {
      this.staged.shift();
    }
    page.stage();
    events.pub('webrequest-pipeline:stage', page);
  }

  /**
   * Create a new `tabContext` for the new tab
   */
  onTabCreated = (tab) => {
    this.tabs.set(tab.id, makeTabContext(tab));
  }

  /**
   * Update an existing tab or create it if we do not have a context yet.
   */
  onTabUpdated = (tabId, info, tab) => {
    let tabContext = this.tabs.get(tabId);
    if (tabContext === undefined) {
      tabContext = makeTabContext(tab);
      this.tabs.set(tabId, tabContext);
    }

    // Update `isPrivate` and `url` if available
    tabContext.isPrivate = tab.incognito;
    tabContext.setActive(tab.active);
    if (info.url !== undefined) {
      tabContext.url = info.url;
    }
  }

  /**
   * Remove tab context for `tabId`.
   */
  onTabRemoved = (tabId) => {
    const tabContext = this.tabs.get(tabId);
    if (tabContext && tabContext.state === PAGE_LOADING_STATE.COMPLETE) {
      this.stagePage(tabContext);
    }
    this.tabs.delete(tabId);
  }

  onTabActivated = ({ previousTabId, tabId }) => {
    // if previousTabId is not set (e.g. on chrome), set all tabs to inactive
    // otherwise, we only have to mark the previous tab as inactive
    if (!previousTabId) {
      for (const tab of this.tabs.values()) {
        tab.setActive(false);
      }
    } else if (this.tabs.has(previousTabId)) {
      this.tabs.get(previousTabId).setActive(false);
    }
    if (this.tabs.has(tabId)) {
      this.tabs.get(tabId).setActive(true);
    }
  }

  onWindowFocusChanged = (focusedWindow) => {
    tabs.query({ active: true }, (activeTabs) => {
      activeTabs.forEach(({ id, windowId }) => {
        const tabContext = this.tabs.get(id);
        if (!tabContext) {
          return;
        }
        if (windowId === focusedWindow) {
          tabContext.setActive(true);
        } else {
          tabContext.setActive(false);
        }
      });
    });
  }

  onBeforeNavigate = (details) => {
    const { frameId, tabId, url } = details;
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0) {
      // We are starting a navigation to a new page - if the previous page is complete (i.e. fully
      // loaded), stage it before we create the new page info.
      if (tabContext && tabContext.state === PAGE_LOADING_STATE.COMPLETE) {
        this.stagePage(tabContext);
      }
      // create a new page for the navigation
      this.tabs.delete(tabId);
      const nextContext = makeTabContext({
        id: tabId,
        active: false,
        url,
        incognito: tabContext ? tabContext.isPrivate : false
      });
      nextContext.previous = tabContext;
      this.tabs.set(tabId, nextContext);
      nextContext.updateState(PAGE_LOADING_STATE.NAVIGATING);
    }
  }

  onNavigationCommitted = (details) => {
    const { frameId, tabId } = details;
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0 && tabContext) {
      tabContext.updateState(PAGE_LOADING_STATE.COMMITTED);
    } else if (tabContext && !tabContext.frames.has(frameId)) {
      // frame created without request
      this.onSubFrame(details);
    }
  }

  onNavigationLoaded = ({ frameId, tabId }) => {
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0 && tabContext) {
      tabContext.updateState(PAGE_LOADING_STATE.LOADED);
    }
  }

  onNavigationComplete = ({ frameId, tabId }) => {
    const tabContext = this.tabs.get(tabId);
    if (frameId === 0 && tabContext) {
      tabContext.updateState(PAGE_LOADING_STATE.COMPLETE);
    }
  }

  onMainFrame({ tabId, url, requestId }, event) {
    // main frame from tabId -1 is from service worker and should not be saved
    if (tabId === -1) {
      return;
    }
    // Update last request id from the tab
    let tabContext = this.tabs.get(tabId);
    if (tabContext === undefined) {
      tabContext = makeTabContext({ url, incognito: false });
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

  getPageForRequest({ tabId, frameId, originUrl, type, initiator }) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return null;
    }
    // check if the current page has the given frame id, otherwise check if it belongs to the
    // previous page
    if (!tab.frames.has(frameId)) {
      if (tab.previous && tab.previous.frames.has(frameId)) {
        return tab.previous;
      }
      return null;
    }

    const couldBePreviousPage = frameId === 0 && type !== 'main_frame' && tab.previous;
    // for main frame requests: check if the origin url is from the previous page (Firefox)
    if (couldBePreviousPage
        && tab.url !== originUrl
        && tab.previous.url === originUrl) {
      return tab.previous;
    }
    // on Chrome we have `initiator` which only contains the origin. In this case, check for a
    // different origin
    if (couldBePreviousPage && initiator
        && !tab.url.startsWith(initiator)
        && tab.previous.url.startsWith(initiator)) {
      return tab.previous;
    }
    return tab;
  }
}
