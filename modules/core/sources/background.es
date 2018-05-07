/* eslint no-param-reassign: 'off' */

import events from './events';
import utils from './utils';
import console from './console';
import language from './language';
import config from './config';
import ProcessScriptManager from '../platform/process-script-manager';
import background from './base/background';
import { getCookies, Window, mapWindows } from '../platform/browser';
import resourceManager from './resource-manager';
import inject from './kord/inject';
import { queryCliqz, openLink, openTab, getOpenTabs, getReminders } from '../platform/browser-actions';
import providesServices from './services';

let lastRequestId = 0;
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

    utils.bindObjectFunctions(this.actions, this);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init();

    resourceManager.init();
  },

  unload() {
    this.mm.unload();
    resourceManager.unload();
  },

  dispatchMessage(msg) {
    if (typeof msg.data.requestId === 'number') {
      if (msg.data.requestId in callbacks) {
        this.handleResponse(msg);
      }
      return false;
    }

    this.handleRequest(msg);
    return true;
  },

  handleRequest(msg) {
    const { payload, sender, sendResponse } = msg.data;
    const { action, module, args } = payload;

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
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
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
  },

  actions: {
    notifyProcessInit(processId) {
      events.pub('process:init', processId);
    },
    notifyLocationChange(msg) {
      const windowWrapper = Window.findByTabId(msg.domWindowId);
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
      const appModules = this.app.modules;
      const modules = config.modules.reduce((hash, moduleName) => {
        const module = appModules[moduleName];
        const windowWrappers = mapWindows(window => new Window(window));
        const windows = windowWrappers.reduce((_hash, win) => {
          _hash[win.id] = {
            loadingTime: module.getLoadingTime(win.window),
          };
          return _hash;
        }, Object.create(null));

        hash[moduleName] = {
          name: module.name,
          isEnabled: module.isEnabled,
          loadingTime: module.loadingTime,
          windows,
        };
        return hash;
      }, Object.create(null));

      return {
        modules,
      };
    },
    broadcast(target, payload) {
      this.mm.broadcast(target, payload);
    },
    broadcastMessageToWindow(payload, windowId, module) {
      this.mm.broadcast(`window-${windowId}`, {
        payload,
        module,
        windowId,
      });
    },
    broadcastMessage(url, message) {
      this.mm.broadcast('cliqz:core', {
        action: 'postMessage',
        url,
        args: [JSON.stringify(message)],
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

    openLink(url) {
      openLink(url);
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
    recordLang(url, lang) {
      events.pub('content:dom-ready', url);
      if (lang) {
        language.addLocale(url, lang);
      }
      return Promise.resolve();
    },
    recordMeta(url, meta) {
      events.pub('core:url-meta', url, meta);
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
    queryHTML(url, selector, attribute) {
      const requestId = lastRequestId;
      lastRequestId += 1;

      this.mm.broadcast('cliqz:core', {
        action: 'queryHTML',
        url,
        args: [selector, attribute],
        requestId
      });

      return new Promise((resolve, reject) => {
        callbacks[requestId] = (attributeValues) => {
          delete callbacks[requestId];
          resolve(attributeValues);
        };

        utils.setTimeout(() => {
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
        action: 'getHTML',
        url,
        args: [],
        requestId
      });

      callbacks[requestId] = (doc) => {
        documents.push(doc);
      };

      return new Promise((resolve) => {
        utils.setTimeout(() => {
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

            utils.setTimeout(() => {
              delete callbacks[requestId];
              reject(new Error('getCookie timeout'));
            }, 1000);
          });
        });
    },
  },
});
