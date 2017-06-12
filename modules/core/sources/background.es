import events from './events';
import utils from "./utils";
import console from "./console";
import language from "./language";
import config from "./config";
import ProcessScriptManager from "../platform/process-script-manager";
import HistoryManager from "./history-manager";
import prefs from './prefs';
import background from './base/background';
import { Window, mapWindows, getLang } from '../platform/browser';
import loadLogoDb from "../platform/load-logo-db";
import { isFirefox } from "./platform";
import Storage from './storage';
import resourceManager from './resource-manager';
import inject from './kord/inject';

var lastRequestId = 0;
var callbacks = {};

export default background({

  init(settings) {
    this.settings = settings;
    this.utils = utils;
    utils.init({
      lang: getLang(),
    });

    this.checkSession();
    if(isFirefox){
      language.init();
      HistoryManager.init();
    }
    utils.CliqzLanguage = language;
    this.dispatchMessage = this.dispatchMessage.bind(this);

    utils.bindObjectFunctions(this.actions, this);
    loadLogoDb().then(utils.setLogoDb);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init();

    // @TODO: mobile doesn't use utils.app
    if (utils.app) {
      this.report = utils.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
    }
    resourceManager.init();
  },

  unload() {
    utils.clearTimeout(this.report);
    if (isFirefox) {
      language.unload();
      HistoryManager.unload();
    }
    this.mm.unload();
    resourceManager.unload();
  },

  reportStartupTime() {
    const status = this.actions.status();
    utils.telemetry({
      type: 'startup',
      modules: status.modules,
    });
  },

  checkSession() {
    if (!prefs.has('session')) {
      const session = [
        utils.rand(18),
        utils.rand(6, '0123456789'),
        '|',
        utils.getDay(),
        '|',
        config.settings.channel || 'NONE',
      ].join('');

      utils.setTimeout(() => {
        this.setSupportInfo();
        if(config.settings.channel == 40){
          this.browserDetection();
        }
      }, 30000);

      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);
      prefs.set('new_session', true);
    } else {
      prefs.set('new_session', false);
    }
  },


  dispatchMessage(msg) {
    if (typeof msg.data.requestId === "number") {
      if (msg.data.requestId in callbacks) {
        this.handleResponse(msg);
      }
    } else {
      this.handleRequest(msg);
    }
  },

  handleRequest(msg) {
    const payload = msg.data.payload;
    // TODO: remove this check. messages without a payload should never be sent
    if (!payload) {
      return;
    }
    const { action, module: moduleName, args, requestId } = payload,
      windowId = msg.data.windowId;
    const origin = msg.data.origin;

    const module = utils.app.availableModules[moduleName];
    if (!module) {
      console.error("Process Script", `${moduleName}/${action}`, "Module not available");
      return;
    }

    // inject the required module, then call the requested action
    inject.module(moduleName).action(action, ...(args || []))
    .then((response) => {
      this.mm.broadcast(`window-${windowId}`, {
        origin,
        response,
        action,
        module: moduleName,
        requestId,
      });
    })
    .catch(console.error.bind(null, "Process Script", `${moduleName}/${action}`));
  },

  handleResponse(msg) {
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
  },

  getWindowStatusFromModules(win){
    return config.modules.map((moduleName) => {
      var module = win.CLIQZ.Core.windowModules[moduleName];
      return module && module.status ? module.status() : null;
    })
  },

  setSupportInfo(status) {
    const version = this.settings.version;
    const host = prefs.get('distribution.id', '', '');
    const hostVersion = prefs.get('distribution.version', '', '');
    const info = JSON.stringify({
      version,
      host,
      hostVersion,
      country: utils.getPref('config_location', ''),
      status: status || 'active',
    });


    try {
      ['http://cliqz.com', 'https://cliqz.com'].forEach(url => {
        const ls = new Storage(url);
        ls.setItem('extension-info', info);
      });
    } catch(e) {
      console.log('Error setting localstorage', e);
    }

  },

  browserDetection() {
    var pref = 'detection',
        sites = ["https://www.ghostery.com", "https://ghostery.com"];

    // make sure we only do it once
    if(utils.getPref(pref, false) !== true){
      utils.setPref(pref, true);

      sites.forEach(function(url){
          var ls = new Storage(url)
          if (ls) ls.setItem("cliqz", true)
      });
    }
  },

  events: {
    'core:tab_select': function onTabSelect({ url, isPrivate }) {
      events.pub('core.location_change', url, isPrivate);
    },
    'content:location-change': function onLocationChange({ url, isPrivate }) {
      events.pub('core.location_change', url, isPrivate);
      utils.telemetry({
        'type': 'navigation',
        'action': 'location_change',
      });
    },
  },

  actions: {
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
    restart() {
      return utils.app.extensionRestart();
    },
    status() {
      const availableModules = utils.app.availableModules;
      const modules = config.modules.reduce((hash, moduleName) => {
        const module = availableModules[moduleName];
        const windowWrappers = mapWindows(window => new Window(window));
        const windows = windowWrappers.reduce((hash, win) => {
          const windowModule = module.windows[win.id] || {};
          hash[win.id] = {
            loadingTime: windowModule.loadingTime,
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
      });
    },
    broadcastMessage(url, message) {
      this.mm.broadcast("cliqz:core", {
        action: "postMessage",
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
    queryCliqz(query) {
      let urlBar = utils.getWindow().document.getElementById("urlbar")
      urlBar.mInputField.setUserInput('');
      urlBar.focus();
      urlBar.mInputField.focus();
      urlBar.mInputField.setUserInput(query);
    },

    closePopup() {
      var popup = utils.getWindow().CLIQZ.Core.popup;

      popup.hidePopup();
    },

    setUrlbar(value) {
      let urlBar = utils.getWindow().document.getElementById("urlbar")
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
      events.pub("core:url-meta", url, meta);
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
      return utils.app.enableModule(moduleName);
    },
    disableModule(moduleName) {
      utils.app.disableModule(moduleName);
    },
    resizeWindow(width, height) {
      utils.getWindow().resizeTo(width, height);
    },
    queryHTML(url, selector, attribute) {
      const requestId = lastRequestId++,
        documents = [];

      this.mm.broadcast("cliqz:core", {
        action: "queryHTML",
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
          reject();
        }, 1000);
      });
    },

    getHTML(url, timeout = 1000) {
      const requestId = lastRequestId++,
        documents = [];

      this.mm.broadcast("cliqz:core", {
        action: "getHTML",
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
      const requestId = lastRequestId++,
        documents = [];

      this.mm.broadcast("cliqz:core", {
        action: "getCookie",
        url,
        args: [],
        requestId
      });

      return new Promise( (resolve, reject) => {
        callbacks[requestId] = function (attributeValues) {
          delete callbacks[requestId];
          resolve(attributeValues);
        };

        utils.setTimeout(function () {
          delete callbacks[requestId];
          reject();
        }, 1000);
      });
    },
  },
});
