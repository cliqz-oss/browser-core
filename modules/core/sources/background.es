/* eslint no-param-reassign: 'off' */

import events from './events';
import utils from './utils';
import console from './console';
import language from './language';
import config from './config';
import ProcessScriptManager from '../platform/process-script-manager';
import background from './base/background';
import { getCookies, Window } from '../platform/browser';
import resourceManager from './resource-manager';
import logger from './logger';
import inject from './kord/inject';
import { queryCliqz, openLink, openTab, getOpenTabs, getReminders } from '../platform/browser-actions';
import providesServices from './services';
import bindObjectFunctions from './helpers/bind-functions';
import { httpHandler } from './http';
import { updateTabById } from './tabs';

let lastRequestId = 1;
const callbacks = {};

/**
 * @module core
 * @namespace core
 * @class Background
 */
export default background({

  providesServices,

  init(settings, app) {
    this.settings = settings;
    this.utils = utils;
    this.app = app;

    utils.CliqzLanguage = language;
    this.dispatchMessage = this.dispatchMessage.bind(this);

    bindObjectFunctions(this.actions, this);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init(this.app);

    resourceManager.init();
    logger.init();
  },

  unload() {
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
        if (e.name === 'ModuleDisabledError') {
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
    return Object.keys(this.app.modules).map((module) => {
      const windowModule = this.app.modules[module].getWindowModule(win);
      const backgroundModule = this.app.modules[module].backgroundModule;

      if (windowModule && windowModule.status) {
        return windowModule.status();
      } else if (backgroundModule && backgroundModule.status) {
        return backgroundModule.status();
      }
      return null;
    });
  },

  events: {
    'core:tab_select': function onTabSelect({ url, isPrivate }) {
      events.pub('core.location_change', url, isPrivate);
    },
    'content:location-change': function onLocationChange({ url, isPrivate }) {
      events.pub('core.location_change', url, isPrivate);
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
    notifyLocationChange(msg) {
      const windowWrapper = Window.findByTabId(msg.domWindowId);

      if (!windowWrapper) {
        return;
      }

      const locationChangeMesssage = {
        ...msg,
        windowId: windowWrapper ? windowWrapper.id : null,
        tabId: msg.windowTreeInformation.tabId,
      };

      events.pub('content:location-change', locationChangeMesssage);
    },
    notifyStateChange(...args) {
      const ev = args[0];

      // TODO: design proper property list for the event
      events.pub('content:state-change', {
        url: ev.urlSpec,
        originalUrl: ev.originalUrl,
        triggeringUrl: ev.triggeringUrl,
        windowTreeInformation: ev.windowTreeInformation,
      });

      // DEPRECATED - use content:state-change instead
      events.pub('core.tab_state_change', ...args);
    },
    recordMouseDown(...args) {
      events.pub('core:mouse-down', ...args);
    },
    /**
    * @method actions.recordKeyPress
    */
    recordKeyPress(...args) {
      events.pub('core:key-press', ...args);
    },
    /**
    * @method actions.recordMouseMove
    */
    recordMouseMove(...args) {
      events.pub('core:mouse-move', ...args);
    },
    /**
    * @method actions.recordScroll
    */
    recordScroll(...args) {
      events.pub('core:scroll', ...args);
    },
    /**
    * @method actions.recordCopy
    */
    recordCopy(...args) {
      events.pub('core:copy', ...args);
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

          allStatus.forEach((status, moduleIdx) => {
            result[config.modules[moduleIdx]] = status || null;
          });

          return result;
        });
    },
    sendTelemetry(...args) {
      // Get rid of latest argument, which is the information about sender
      if (args.length > 1) {
        args.pop();
      }
      return Promise.resolve(utils.telemetry(...args));
    },

    refreshPopup(query = '') {
      if (query.trim() !== '') {
        return this.actions.queryCliqz(query);
      }
      const doc = utils.getWindow().document;
      const urlBar = doc.getElementById('urlbar');
      const dropmarker = doc.getAnonymousElementByAttribute(urlBar, 'anonid', 'historydropmarker');
      setTimeout(() => {
        dropmarker.click();
      }, 0);
      return undefined;
    },

    queryCliqz(query) {
      queryCliqz(query);
    },

    openLink(url, { newTab = true } = {}, { tab: { id: tabId } } = { tab: {} }) {
      if (newTab) {
        openLink(url);
      } else if (tabId) {
        updateTabById(tabId, { url });
      }
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
    setUrlbar(value) {
      const urlBar = utils.getWindow().document.getElementById('urlbar');
      urlBar.mInputField.value = value;
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
    openFeedbackPage() {
      const window = utils.getWindow();
      const tab = utils.openLink(
        window,
        utils.FEEDBACK_URL,
        true
      );
      window.gBrowser.selectedTab = tab;
    },
    enableModule(moduleName) {
      return this.app.enableModule(moduleName);
    },
    disableModule(moduleName) {
      this.app.disableModule(moduleName);
    },
    resizeWindow(width, height) {
      utils.getWindow().resizeTo(width, height);
    },
    click(url, selector) {
      const requestId = lastRequestId;
      lastRequestId += 1;

      this.mm.broadcast('cliqz:core', {
        module: 'core',
        action: 'click',
        url,
        args: [selector],
        requestId
      });

      return new Promise((resolve, reject) => {
        callbacks[requestId] = (attributeValues) => {
          delete callbacks[requestId];
          resolve(attributeValues);
        };

        setTimeout(() => {
          delete callbacks[requestId];
          reject(new Error('click timeout'));
        }, 1000);
      });
    },
    queryHTML(url, selector, attribute, options = {}) {
      const requestId = lastRequestId;
      lastRequestId += 1;

      this.mm.broadcast('cliqz:core', {
        module: 'core',
        action: 'queryHTML',
        url,
        args: [selector, attribute, options],
        requestId
      });

      return new Promise((resolve, reject) => {
        callbacks[requestId] = (attributeValues) => {
          delete callbacks[requestId];
          resolve(attributeValues);
        };

        setTimeout(() => {
          delete callbacks[requestId];
          reject(new Error('queryHTML timeout'));
        }, 1000);
      });
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
        setTimeout(() => {
          delete callbacks[requestId];
          resolve(documents);
        }, timeout);
      });
    },

    getCookie(url) {
      return getCookies(url)
        .catch(() => {
          const requestId = lastRequestId;
          lastRequestId += 1;

          this.mm.broadcast('cliqz:core', {
            module: 'core',
            action: 'getCookie',
            url,
            args: [],
            requestId
          });

          return new Promise((resolve, reject) => {
            callbacks[requestId] = (attributeValues) => {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            setTimeout(() => {
              delete callbacks[requestId];
              reject(new Error('getCookie timeout'));
            }, 1000);
          });
        });
    },
    sendUserFeedback(data) {
      data._type = 'user_feedback';
      // Params: method, url, resolve, reject, timeout, data
      httpHandler('POST', config.settings.STATISTICS, null, null, 10000, JSON.stringify(data));
    },

    refreshAppState() {
      this.mm.shareAppState(this.app);
    },
  },
});
