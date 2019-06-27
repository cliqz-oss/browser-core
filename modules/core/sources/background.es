/* eslint no-param-reassign: 'off' */

import events from './events';
import telemetry from './services/telemetry';
import console from './console';
import language from './language';
import config from './config';
import ProcessScriptManager from '../platform/process-script-manager';
import background from './base/background';
import { getCookies } from './browser';
import resourceManager from './resource-manager';
import logger from './logger';
import inject from './kord/inject';
import { queryCliqz, openLink, openTab, getOpenTabs, getReminders } from '../platform/browser-actions';
import providesServices from './services';
import { httpHandler } from './http';
import { updateTab, closeTab, query, getCurrentTab } from './tabs';
import { enableRequestSanitizer, disableRequestSanitizer } from './request-sanitizer';
import { cleanMozillaActions } from './content/url';
import ResourceLoader from './resource-loader';
import { getResourceUrl } from './platform';
import pacemaker from './services/pacemaker';
import { ModuleDisabledError } from './app/module-errors';

let lastRequestId = 1;
const callbacks = {};

/**
 * @module core
 * @namespace core
 * @class Background
 */
export default background({
  requiresServices: ['pacemaker', 'telemetry'],
  providesServices,

  init(settings, app) {
    enableRequestSanitizer();

    this.settings = settings;
    this.app = app;

    this.dispatchMessage = this.dispatchMessage.bind(this);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init(this.app);

    resourceManager.init();
    logger.init();
  },

  unload() {
    disableRequestSanitizer();

    this.mm.unload();
    resourceManager.unload();
    logger.unload();
  },

  dispatchMessage(message, sender, sendResponse) {
    if (typeof message.requestId === 'number') {
      if (message.requestId in callbacks) {
        this.handleResponse(message);
      }
      return false;
    }

    this.handleRequest(message, sender, sendResponse);
    return true;
  },

  handleRequest(message, sender, sendResponse) {
    const { action, module, args } = message;
    if (!module || !action) {
      // no module or action provided, probably not from cliqz
      return Promise.resolve();
    }

    // inject the required module, then call the requested action
    return inject
      .module(module)
      .action(action, ...[...(args || []), sender])
      .catch((e) => {
        if (e instanceof ModuleDisabledError) {
          return {
            moduleDisabled: true,
          };
        }
        console.error(`Process Script ${module}/${action}`, e);
        throw e;
      })
      .then(sendResponse);
  },

  handleResponse(msg) {
    callbacks[msg.requestId].apply(null, [msg.response]);
  },

  getWindowStatusFromModules(win) {
    return Object.keys(this.app.modules).map(async (module) => {
      const windowModule = this.app.modules[module].getWindowModule(win);
      const backgroundModule = this.app.modules[module].backgroundModule;
      let status = null;
      if (windowModule && windowModule.status) {
        status = await windowModule.status();
      } else if (backgroundModule && backgroundModule.status) {
        status = await backgroundModule.status();
      }
      return { module, status };
    });
  },

  callContentAction(action, url, ...args) {
    const requestId = lastRequestId;
    lastRequestId += 1;

    this.mm.broadcast('cliqz:core', {
      module: 'core',
      action,
      url,
      args,
      requestId
    });

    return new Promise((resolve, reject) => {
      callbacks[requestId] = (attributeValues) => {
        delete callbacks[requestId];
        resolve(attributeValues);
      };

      pacemaker.setTimeout(() => {
        delete callbacks[requestId];
        reject(new Error(`${action} timeout`));
      }, 1000);
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
    notifyProcessInit(processId) {
      events.pub('process:init', processId);
      this.mm.onNewProcess(processId);
    },
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
      this.mm.broadcast(target, payload);
    },
    broadcastActionToWindow(windowId, module, action, ...args) {
      this.mm.broadcast(`window-${windowId}`, {
        action,
        args,
        module,
        windowId,
      });
    },
    // TODO: should be replaced with a function that sends message to given tabId
    broadcastMessage(url, message) {
      this.mm.broadcast('cliqz:core', {
        url,
        ...message,
      });
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
    sendTelemetry(signal, instant, schema) {
      return telemetry.push(signal, schema, instant);
    },

    queryCliqz(q) {
      queryCliqz(q);
    },

    async openLink(url, { newTab = true } = {}, { tab: { id: tabId } } = { tab: {} }) {
      if (newTab) {
        openLink(url);
        return;
      }

      const [action, originalUrl] = cleanMozillaActions(url);
      let id = tabId;

      if (action === 'switchtab') {
        const tabs = await query({
          url: originalUrl.replace(/#.*$/, ''),
        });
        const tab = tabs.find(t => t.url === originalUrl);
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
      updateTab(id, { url: originalUrl });
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
    click(url, selector) {
      return this.callContentAction('click', url, selector);
    },
    queryHTML(url, selector, attribute, options = {}) {
      return this.callContentAction('queryHTML', url, selector, attribute, options);
    },

    getHTML(url, timeout = 1000) {
      const requestId = lastRequestId;
      lastRequestId += 1;
      const documents = [];

      this.mm.broadcast('cliqz:core', {
        module: 'core',
        action: 'getHTML',
        url,
        args: [],
        requestId
      });

      callbacks[requestId] = (doc) => {
        documents.push(doc);
      };

      return new Promise((resolve) => {
        pacemaker.setTimeout(() => {
          delete callbacks[requestId];
          resolve(documents);
        }, timeout);
      });
    },

    getCookie(url) {
      return getCookies(url)
        .catch(() => this.callContentAction('getCookie', url));
    },
    queryComputedStyle(url, selector) {
      return this.callContentAction('queryComputedStyle', url, selector);
    },
    sendUserFeedback(data) {
      data._type = 'user_feedback';
      // Params: method, url, resolve, reject, timeout, data
      httpHandler('POST', config.settings.STATISTICS, null, null, 10000, JSON.stringify(data));
    },

    refreshAppState() {
      this.mm.shareAppState(this.app);
    },

    reportResourceLoaders() {
      return ResourceLoader.report();
    },
  },
});
