import { events, Promise } from "core/cliqz";
import utils from "./utils";
import console from "core/console";
import language from "platform/language";
import config from "core/config";
import ProcessScriptManager from "platform/process-script-manager";
import HistoryManager from "./history-manager";
import Language from "./language";
import prefs from './prefs';
import background from './base/background';
import { Window, mapWindows } from '../platform/browser';

var lastRequestId = 0;
var callbacks = {};

export default background({

  init(settings) {
    this.checkSession();
    Language.init();
    HistoryManager.init();
    this.dispatchMessage = this.dispatchMessage.bind(this);
    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init();

    this.report = utils.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
  },

  unload() {
    utils.clearTimeout(this.report);
    Language.unload();
    HistoryManager.unload();
    this.mm.unload();
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
      utils.setSupportInfo()
      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);
      prefs.set('new_session', true);
    } else {
      prefs.set('new_session', false);
    }
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
    const { action, module, args, requestId } = msg.data.payload,
          windowId = msg.data.windowId;
    utils.importModule(`${module}/background`).then( module => {
      const background = module.default;
      return background.actions[action].apply(null, args);
    }).then( response => {
      this.mm.broadcast(`window-${windowId}`, {
        response,
        action: msg.data.payload.action,
        requestId,
      });
    }).catch(console.error.bind(null, "Process Script", `${action}/${module}`));
  },

  handleResponse(msg) {
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
  },

  getWindowStatusFromModules(win){
    return config.modules.map((moduleName) => {
      var module = win.CLIQZ.Core.windowModules[moduleName];
      return module && module.status ? module.status() : {}
    })
  },

  events: {
    'prefchange': function onPrefChange() {
    }
  },

  actions: {
    restart() {
      return utils.extensionRestart();
    },
    status() {
      if (!utils.Extension) {
        return {};
      }
      const availableModules = utils.Extension.app.availableModules;
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
      urlBar.focus();
      urlBar.mInputField.focus();
      urlBar.mInputField.setUserInput(query);
    },

    closePopup() {
      var popup = utils.getWindow().CLIQZ.Core.popup;

      popup.hidePopup();
    },

    setUrlbar(value) {
      return this.actions.queryCliqz(value);
    },
    recordLang(url, lang) {
      if (lang) {
        language.addLocale(url, lang);
      }
      return Promise.resolve();
    },
    recordMeta(url, meta) {
      events.pub("core:url-meta", url, meta);
    },
    getFeedbackPage() {
      return utils.FEEDBACK_URL;
    },
    enableModule(moduleName) {
      return utils.Extension.app.enableModule(moduleName);
    },
    disableModule(moduleName) {
      utils.Extension.app.disableModule(moduleName);
    },
    resizeWindow(width, height) {
      utils.getWindow().resizeTo(width, height);
    },
  },
});
