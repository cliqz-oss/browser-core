/* globals ChromeUtils, sendAsyncMessage, removeMessageListener, addMessageListener */

import { Components, Services } from '../platform/globals';
import store from '../core/content/store';
import config from '../core/config';
import { CHROME_MSG_SOURCE } from '../core/content/helpers';
import { getMessage } from '../core/i18n';

const send = sendAsyncMessage.bind(null, 'cliqz');
const CONTENT_SCRIPT_URL = 'chrome://cliqz/content/core/content-script.bundle.js';
const whitelistedPages = [
  'resource://cliqz',
  'chrome://cliqz',
  config.settings.NEW_TAB_URL
].concat(config.settings.frameScriptWhitelist || []);

const getContentScript = () => {
  try {
    Components.utils.importGlobalProperties(['ChromeUtils']);
  } catch (e) {
    // ChromeUtils are available only in Firefox 60 +
    return Promise.resolve({ hasReturnValue: false });
  }

  if (getContentScript.compiledContentScript) {
    return Promise.resolve(getContentScript.compiledContentScript);
  }

  return ChromeUtils.compileScript(CONTENT_SCRIPT_URL).then((script) => {
    getContentScript.compiledContentScript = script;
    return script;
  });
};

const getWindowId = window => window
  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
  .getInterface(Components.interfaces.nsIDOMWindowUtils)
  .outerWindowID;

/**
 * Run function for all existing documents.
 */
function forEachTab(fn) {
  const windowEnumerator = Services.ww.getWindowEnumerator();
  while (windowEnumerator.hasMoreElements()) {
    const window = windowEnumerator.getNext();

    if (window.gBrowser && window.gBrowser.tabs) {
      // this is a browser (chrome) window so we need to inject the
      // content scripts in all openend tabs
      window.gBrowser.tabs.forEach((tab) => {
        try {
          fn(tab.linkedBrowser.contentDocument);
        } catch (e) {
          // failed to load into existing window
        }
      });
    } else {
      // this is a content window so we need to inject content scripts directly
      try {
        fn(window.document);
      } catch (e) {
        // failed to load into existing window
      }
    }
  }
}

const DocumentManager = {
  init() {
    this._windowsInfo = new WeakMap();
    Services.obs.addObserver(this, 'document-element-inserted', false);
    getContentScript().then(() => {
      forEachTab(this.observe.bind(this));
    });
  },

  uninit() {
    forEachTab(this.cleanup.bind(this));
    Services.obs.removeObserver(this, 'document-element-inserted');
  },

  cleanup(document) {
    const window = document && document.defaultView;
    if (!document || !document.location ||
      !window || !this._windowsInfo.has(window)) {
      return;
    }
    const info = this._windowsInfo.get(window);

    removeMessageListener(`window-${info.windowId}`, info.onMessage);
    removeMessageListener('cliqz:core', info.onMessage);

    if (info.unsafeWindow) {
      delete info.unsafeWindow.chrome;
    }

    info.onUnload();
  },

  async observe(document) {
    const window = document && document.defaultView;
    if (!document || !document.location || !window) {
      return;
    }

    const currentUrl = window.location.href;

    const isChromePage = whitelistedPages.some(url => currentUrl.indexOf(url) === 0);

    // avoid internal pages like about:black about:newtab and non cliqz chrome:// or resource://
    if (!isChromePage && !['http://', 'https://'].some(prefix => currentUrl.indexOf(prefix) === 0)) {
      return;
    }

    const contentScript = getContentScript.compiledContentScript;

    const windowId = getWindowId(window);
    const listeners = new Set();
    let unsafeWindow = null;

    const onMessage = (incomingMessage) => {
      if (incomingMessage.windowId && (incomingMessage.windowId !== windowId)) {
        return;
      }

      let message = incomingMessage.data;

      if (isChromePage) {
        // TODO: we should have uniform message shape
        const payload = incomingMessage.data.payload;
        if (payload && payload.response) {
          message = payload.response;
        } else if (payload) {
          message = payload;
        } else {
          message = incomingMessage.data;
        }
      } else {
        message.type = 'response';
      }

      message = Components.utils.cloneInto(message, window);

      listeners.forEach((l) => {
        try {
          l(message);
        } catch (e) {
          // don't throw if any of the listeners thrown
        }
      });
    };

    addMessageListener('cliqz:core', onMessage);
    addMessageListener(`window-${windowId}`, onMessage);

    const onUnload = () => {
      removeMessageListener(`window-${windowId}`, onMessage);
      removeMessageListener('cliqz:core', onMessage);
      this._windowsInfo.delete(window);
    };

    window.addEventListener('unload', onUnload);

    const sender = {
      url: window.location.href,
      tab: {
        id: getWindowId(window.top),
        url: window.top.location.href,
      },
    };

    if (isChromePage) {
      const safeChrome = {
        runtime: {
          sendMessage(message) {
            send({
              source: CHROME_MSG_SOURCE,
              origin: 'content',
              windowId,
              payload: message,
              sender,
            });
          },
          onMessage: {
            addListener(listener) {
              listeners.add(listener);
            },
            removeListener(listener) {
              listeners.delete(listener);
            },
          }
        },
        i18n: {
          getMessage,
        },
      };

      unsafeWindow = Components.utils.waiveXrays(window);
      unsafeWindow.chrome = Components.utils.cloneInto(safeChrome, window, {
        cloneFunctions: true
      });
    }

    const chrome = {
      runtime: {
        sendMessage(message) {
          send({
            ...message,
            windowId,
            sender,
            source: CHROME_MSG_SOURCE
          });
        },
        onMessage: {
          addListener(listener) {
            listeners.add(listener);
          },
          removeListener(listener) {
            listeners.delete(listener);
          }
        },
      },
    };

    if (isChromePage || !contentScript || !contentScript.hasReturnValue) {
      Services.scriptloader.loadSubScript('chrome://cliqz/content/core/content-script.bundle.js', {
        window,
        chrome,
        windowId,
      });
    } else {
      // For Firefox 60+ we precompile content scripts in same way Firefox
      // webextensions does
      const contentPrincipal = window.document.nodePrincipal;
      const attrs = contentPrincipal.originAttributes;
      const ssm = Services.scriptSecurityManager;
      const uri = Services.io.newURI(CONTENT_SCRIPT_URL);
      const extensionPrincipal = ssm.createCodebasePrincipal(uri, attrs);
      // source: https://github.com/mozilla/gecko-dev/blob/4d5798c0a5103636aef38f3b668b5463797b4dfc/toolkit/components/extensions/ExtensionContent.jsm#L529
      let principal;
      if (ssm.isSystemPrincipal(contentPrincipal)) {
        // Make sure we don't hand out the system principal by accident.
        // also make sure that the null principal has the right origin attributes
        principal = ssm.createNullPrincipal(attrs);
      } else {
        principal = [contentPrincipal, extensionPrincipal];
      }

      const sandbox = Components.utils.Sandbox(principal, {
        sandboxName: 'Content Script Cliqz',
        sandboxPrototype: window,
        sameZoneAs: window,
        wantXrays: true,
        isWebExtensionContentScript: true,
        wantExportHelpers: true,
        wantGlobalProperties: [],
        originAttributes: attrs,
      });

      sandbox.chrome = Components.utils.cloneInto(chrome, sandbox, {
        cloneFunctions: true
      });

      contentScript.executeInGlobal(sandbox);
    }

    this._windowsInfo.set(window, {
      windowId,
      onMessage,
      unsafeWindow,
      onUnload,
    });
  }
};

DocumentManager.init();

// Create a new processScriptId
const processId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  /* eslint-disable */
  const r = Math.random() * 16|0, v = c === 'x' ? r : (r&0x3|0x8);
  /* eslint-enable */
  return v.toString(16);
});

send({
  payload: {
    module: 'core',
    action: 'notifyProcessInit',
    args: [
      processId
    ],
    source: CHROME_MSG_SOURCE
  },
});

const dispatchMessage = (msg) => {
  if (msg.action === 'updateStore') {
    store.update({
      module: msg.args[0].module,
      data: msg.args[0].data,
    });
  }
};

addMessageListener(`cliqz:process-script-${processId}`, msg => dispatchMessage(msg.data));

/**
 * make sure to unload propertly
 */
addMessageListener('cliqz:process-script', function ps(msg) {
  const data = typeof msg.data === 'string' ? {
    action: msg.data
  } : msg.data;
  if (data.action === 'unload') {
    store.unload();
    DocumentManager.uninit();
    removeMessageListener('cliqz:process-script', ps);
    removeMessageListener(`cliqz:process-script-${processId}`, dispatchMessage);
  } else {
    dispatchMessage(data);
  }
});
