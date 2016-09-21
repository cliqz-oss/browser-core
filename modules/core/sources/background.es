import { utils, events, Promise } from "core/cliqz";
import language from "platform/language";
import config from "core/config";
import ProcessScriptManager from "platform/process-script-manager";

var lastRequestId = 0;
var callbacks = {};

export default {

  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

    utils.bindObjectFunctions(this.actions, this);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init();
  },

  unload() {
    this.mm.unload();
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
    }).catch( e => utils.log(`${e.toString()}--${e.stack}`, "Problem with frameScript") );
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

  actions: {
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
    }
  }
};
