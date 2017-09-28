/* globals sendAsyncMessage, removeMessageListener, addMessageListener */

import { Services } from '../platform/globals';
import store from '../core/content/store';
import config from '../core/config';
import { getWindowId, CHROME_MSG_SOURCE } from '../core/content/helpers';
import { getMessage } from '../core/i18n';

const send = sendAsyncMessage.bind(null, 'cliqz');

const DocumentManager = {

  init() {
    Services.obs.addObserver(this, 'document-element-inserted', false);
  },

  uninit() {
    Services.obs.removeObserver(this, 'document-element-inserted');
  },

  observe(document) {
    const window = document && document.defaultView;
    if (!document || !document.location || !window) {
      return;
    }

    const windowId = getWindowId(window);
    const listeners = new Set();

    const onMessage = (incomingMessage) => {
      listeners.forEach((l) => {
        const unsafeMessage = Components.utils.cloneInto({
          ...incomingMessage.data,
          type: 'response',
        }, window);

        l(unsafeMessage);
      });
    };

    addMessageListener('cliqz:core', onMessage);
    addMessageListener(`window-${windowId}`, onMessage);

    window.addEventListener('unload', () => {
      removeMessageListener(`window-${windowId}`, onMessage);
      removeMessageListener('cliqz:core', onMessage);
    });

    if (window.location.href.indexOf(config.baseURL) === 0) {
      const safeChrome = {
        runtime: {
          sendMessage(message) {
            send({
              source: CHROME_MSG_SOURCE,
              origin: 'content',
              windowId,
              payload: message,
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

      const unsafeWindow = Components.utils.waiveXrays(window);
      unsafeWindow.chrome = Components.utils.cloneInto(safeChrome, window, {
        cloneFunctions: true
      });
    }

    const chrome = {
      runtime: {
        sendMessage(message) {
          send({
            ...message,
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
  }
};

DocumentManager.init();

/**
 * Load to already existing documents. It is important for extension updates
 * and some race conditions during browser startup.
 */
const windowEnumerator = Services.ww.getWindowEnumerator();
while (windowEnumerator.hasMoreElements()) {
  const window = windowEnumerator.getNext();
  try {
    DocumentManager.observe({ defaultView: window });
  } catch (e) {
    // the only exception expected here is if the window would not be fully
    // elevated to full nsIDomWindow. Need to tests this code more.
  }
}

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
  if (msg.data === 'unload') {
    DocumentManager.uninit();
    removeMessageListener('cliqz:process-script', ps);
    removeMessageListener(`cliqz:process-script-${processId}`, dispatchMessage);
  } else {
    dispatchMessage(msg.data);
  }
});
