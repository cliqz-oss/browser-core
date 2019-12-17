/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import events from './events';
import telemetry from './services/telemetry';
import language from './language';
import config from './config';
import LocationChangeObserver from '../platform/location-change-observer';
import ContentCommunicationManager from '../platform/content-communication-manager';
import FastContentAppStateInjecter from '../platform/fast-content-app-state-injection';
import background from './base/background';
import resourceManager from './resource-manager';
import logger from './logger';
import { queryCliqz, openLink, openTab, getOpenTabs, getReminders } from '../platform/browser-actions';
import providesServices from './services';
import { httpHandler } from './http';
import { updateTab, closeTab, query, getCurrentTab } from './tabs';
import { enableRequestSanitizer, disableRequestSanitizer } from './request-sanitizer';
import ResourceLoader from './resource-loader';
import { getResourceUrl } from './platform';
import { isUrl, fixURL } from '../core/url';
import { getEngineByQuery } from '../core/search-engines';

// Telemetry schemas
import modulesStartupMetric from './telemetry/metrics/modules-startup';
import performanceMetric from './telemetry/metrics/performance';
import resourceLoadersMetric from './telemetry/metrics/resource-loaders';
import versionsMetrics from './telemetry/metrics/versions';
import performanceAnalysis from './telemetry/analyses/performance';

/**
 * @module core
 * @namespace core
 * @class Background
 */
export default background({
  requiresServices: [
    'pacemaker',
    'host-settings',
    'telemetry',
    'domainInfo',
  ],
  providesServices,

  init(settings) {
    telemetry.register([
      modulesStartupMetric,
      performanceMetric,
      resourceLoadersMetric,
      ...versionsMetrics,
      performanceAnalysis,
    ]);

    enableRequestSanitizer();

    this.settings = settings;

    this.bm = new ContentCommunicationManager();
    this.bm.init();

    this.mm = new LocationChangeObserver();
    this.mm.init();

    this.appStateInjecter = new FastContentAppStateInjecter();
    this.appStateInjecter.init(this.app);

    resourceManager.init();
    logger.init();
  },

  unload() {
    disableRequestSanitizer();

    this.bm.unload();
    this.mm.unload();
    this.appStateInjecter.unload();
    resourceManager.unload();
    logger.unload();
  },

  getWindowStatusFromModules() {
    let currentTab;
    return Object.keys(this.app.modules).map(async (module) => {
      const backgroundModule = this.app.modules[module].background;
      let status = null;
      if (backgroundModule && backgroundModule.currentWindowStatus) {
        if (!currentTab) {
          currentTab = await getCurrentTab();
        }
        status = await backgroundModule.currentWindowStatus(currentTab);
      } else if (backgroundModule && backgroundModule.status) {
        status = await backgroundModule.status();
      }
      return { module, status };
    });
  },

  events: {
    'core:tab_select': function onTabSelect({ url, incognito, id }) {
      events.pub('core.location_change', url, incognito, id);
    },
    'content:location-change': function onLocationChange({ url, isPrivate, tabId }) {
      events.pub('core.location_change', url, isPrivate, tabId);
    },
    prefchange: function onPrefChange(pref) {
      if (pref.startsWith('modules.') && pref.endsWith('.enabled')) {
        this.actions.refreshAppState(this.app);
      }
    },
  },

  actions: {
    recordMouseDown(...args) {
      events.pub('core:mouse-down', ...args);
    },

    /**
     * publish an event using events.pub
     * @param  {String}    evtChannel channel name
     * @param  {...[objects]} args       arguments to sent
     */
    publishEvent(evtChannel, ...args) {
      events.pub(evtChannel, ...args);
    },

    restart() {
      return this.app.extensionRestart();
    },

    status() {
      return this.app.status();
    },

    broadcast(target, payload) {
      if (!payload && typeof target === 'object') {
        payload = target;
        target = null;
      }
      return this.bm.broadcast(target, payload);
    },

    getWindowStatus(win) {
      return Promise
        .all(this.getWindowStatusFromModules(win))
        .then((allStatus) => {
          const result = {};

          allStatus.forEach(({ module, status }) => {
            result[module] = status || null;
          });

          return result;
        });
    },

    /**
     * WARNING: this action shall not be removed because it is needed by some
     * external extensions to send telemetry (using inter extension messaging).
     */
    sendTelemetry(signal, instant, schema) {
      return telemetry.push(signal, schema, instant);
    },

    queryCliqz(q) {
      queryCliqz(q);
    },

    async openLink(
      url,
      { newTab = true, switchTab = false } = {},
      { tab: { id: tabId } = {} } = {}
    ) {
      let fixedURL = fixURL(url);
      if (!isUrl(url) || !fixedURL) {
        // This url cannot be opened, open search page instead
        const engine = getEngineByQuery(url);
        fixedURL = engine.getSubmissionForQuery(url);
      }

      if (newTab) {
        openLink(fixedURL);
        return;
      }

      let id = tabId;
      if (switchTab && !newTab) {
        const tabs = await query({
          url: url.replace(/#.*$/, ''),
        });
        const tab = tabs.find(t => t.url === fixedURL);
        if (tab) {
          const currentTab = await getCurrentTab();
          id = tab.id;
          updateTab(id, { active: true });
          if (currentTab && currentTab.url === getResourceUrl(config.settings.NEW_TAB_URL)) {
            closeTab(tabId);
          }
          return;
        }
      }
      updateTab(id, { url: fixedURL });
    },

    openTab(tabId) {
      openTab(tabId);
    },

    getOpenTabs() {
      return getOpenTabs();
    },

    getReminders(domain) {
      return getReminders(domain);
    },

    recordMeta(url, meta, sender) {
      // TODO: there is not need for two events doing almost the same
      // also the tabId, windowId, should be propagated with the event
      events.pub('core:url-meta', url, meta);
      events.pub('content:dom-ready', url, sender);
      if (meta.lang) {
        language.addLocale(url, meta.lang);
      }
    },

    enableModule(moduleName) {
      return this.app.enableModule(moduleName);
    },

    disableModule(moduleName) {
      this.app.disableModule(moduleName);
    },

    callContentAction(module, action, target, ...args) {
      return this.bm.callContentAction(module, action, target, ...args);
    },

    click(url, selector) {
      return this.bm.callContentAction('core', 'click', { url }, selector);
    },

    queryHTML(url, selector, attribute, options = {}) {
      return this.bm.callContentAction('core', 'queryHTML', { url }, selector, attribute, options);
    },

    getHTML(url) {
      return this.bm.callContentAction('core', 'getHTML', { url });
    },

    queryComputedStyle(url, selector) {
      return this.bm.callContentAction('core', 'queryComputedStyle', { url }, selector);
    },

    sendUserFeedback(data) {
      data._type = 'user_feedback';
      // Params: method, url, resolve, reject, timeout, data
      httpHandler('POST', config.settings.STATISTICS, null, null, 10000, JSON.stringify(data));
    },

    refreshAppState() {
      this.appStateInjecter.shareAppState(this.app);
    },

    reportResourceLoaders() {
      return ResourceLoader.report();
    },
  },
});
