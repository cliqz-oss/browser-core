import events from './events';
import utils from './utils';
import console from './console';
import language from './language';
import config from './config';
import ProcessScriptManager from '../platform/process-script-manager';
import prefs from './prefs';
import background from './base/background';
import { Window, mapWindows } from '../platform/browser';
import resourceManager from './resource-manager';
import inject from './kord/inject';
import { getCookies } from '../platform/browser';
import { queryCliqz, openLink, openTab, getOpenTabs, getReminders } from '../platform/browser-actions';
import providesServices from './services';

var lastRequestId = 0;
var callbacks = {};

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
    } else {
      this.handleRequest(msg);
    }
  },

  handleRequest(msg) {
    const payload = msg.data.payload;
    const sender = msg.data.sender;
    // TODO: remove this check. messages without a payload should never be sent
    if (!payload) {
      return;
    }
    const { action, module: moduleName, args, requestId } = payload,
      windowId = msg.data.windowId;
    const origin = msg.data.origin;

    const module = this.app.modules[moduleName];
    if (!module) {
      console.error('Process Script', `${moduleName}/${action}`, 'Module not available');
      return;
    }

    // inject the required module, then call the requested action
    inject.module(moduleName).action(action, ...[...(args || []), sender])
    .then((response) => {
      this.mm.broadcast(`window-${windowId}`, {
        origin,
        response,
        action,
        module: moduleName,
        requestId,
        windowId,
      });
    })
    .catch(console.error.bind(null, 'Process Script', `${moduleName}/${action}`));
  },

  handleResponse(msg) {
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
  },

  getWindowStatusFromModules(win) {
    return Object.keys(this.app.modules).map((module) => {
      const windowModule = this.app.modules[module].getWindowModule(win);
      return windowModule && windowModule.status ? windowModule.status() : null;
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
    notifyLocationChange(...args) {
      events.pub('content:location-change', ...args);
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
    recordKeyPress() {
      events.pub('core:key-press', ...arguments);
    },
    /**
    * @method actions.recordMouseMove
    */
    recordMouseMove() {
      events.pub('core:mouse-move', ...arguments);
    },
    /**
    * @method actions.recordScroll
    */
    recordScroll() {
      events.pub('core:scroll', ...arguments);
    },
    /**
    * @method actions.recordCopy
    */
    recordCopy() {
      events.pub('core:copy', ...arguments);
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
        const windows = windowWrappers.reduce((hash, win) => {
          hash[win.id] = {
            loadingTime: module.getLoadingTime(win.window),
          };
          return hash;
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
          var result = {}

          allStatus.forEach((status, moduleIdx) => {
            result[config.modules[moduleIdx]] = status || null;
          })

          return result;
        })
    },
    sendTelemetry(msg) {
      utils.telemetry(msg);
      return Promise.resolve();
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

    closePopup() {
      var popup = utils.getWindow().CLIQZ.Core.popup;

      popup.hidePopup();
    },

    setUrlbar(value) {
      let urlBar = utils.getWindow().document.getElementById('urlbar')
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
      const requestId = lastRequestId++,
        documents = [];

      this.mm.broadcast('cliqz:core', {
        action: 'queryHTML',
        url,
        args: [selector, attribute],
        requestId
      });

      return new Promise( (resolve, reject) => {
        callbacks[requestId] = function (attributeValues) {
          delete callbacks[requestId];
          resolve(attributeValues);
        };

        utils.setTimeout(function () {
          delete callbacks[requestId];
          reject(new Error('queryHTML timeout'));
        }, 1000);
      });
    },

    getHTML(url, timeout = 1000) {
      const requestId = lastRequestId++,
        documents = [];

      this.mm.broadcast('cliqz:core', {
        action: 'getHTML',
        url,
        args: [],
        requestId
      });

      callbacks[requestId] = function (doc) {
        documents.push(doc);
      };

      return new Promise( resolve => {
        utils.setTimeout(function () {
          delete callbacks[requestId];
          resolve(documents);
        }, timeout);
      });
    },

    getCookie(url) {
      return getCookies(url)
        .catch(() => {
          const requestId = lastRequestId++;

          this.mm.broadcast('cliqz:core', {
            action: 'getCookie',
            url,
            args: [],
            requestId
          });

          return new Promise((resolve, reject) => {
            callbacks[requestId] = function (attributeValues) {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            utils.setTimeout(function () {
              delete callbacks[requestId];
              reject(new Error('getCookie timeout'));
            }, 1000);
          });
        });
    },
  },
});
