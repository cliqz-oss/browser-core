/* globals sendAsyncMessage, removeMessageListener, addMessageListener */

import { Services } from '../platform/globals';
import store from '../core/content/store';
import config from '../core/config';
import { getWindowId, CHROME_MSG_SOURCE } from '../core/content/helpers';
import { getMessage } from '../core/i18n';

const send = sendAsyncMessage.bind(null, 'cliqz');

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
    forEachTab(this.observe.bind(this));
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

  observe(document) {
    const window = document && document.defaultView;
    if (!document || !document.location || !window) {
      return;
    }

    const windowId = getWindowId(window);
    const listeners = new Set();
    let unsafeWindow = null;

    const onMessage = (incomingMessage) => {
      listeners.forEach((l) => {
        try {
          const unsafeMessage = Components.utils.cloneInto({
            ...incomingMessage.data,
            type: 'response',
          }, window);

          l(unsafeMessage);
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

    const whitelistedPages = [
      'resource://cliqz',
      'chrome://cliqz',
      config.settings.NEW_TAB_URL
    ].concat(config.settings.frameScriptWhitelist || []);

    if (whitelistedPages.some(url => window.location.href.indexOf(url) === 0)) {
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
    Services.scriptloader.loadSubScript('chrome://cliqz/content/core/content-script.bundle.js', {
      window,
      chrome,
      windowId,
    });

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
