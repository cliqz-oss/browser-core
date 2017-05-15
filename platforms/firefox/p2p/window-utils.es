/* eslint-disable no-bitwise */

// Firefox 55 compatible background window creation (old hiddenWindow method stopped working)
// See https://github.com/gorhill/uBlock/issues/2493 and
// https://github.com/gorhill/uBlock/blob/dc06d5fa0cbecfc10f7f1e96af04f945e016bc1c/platform/firefox/bootstrap.js

const { classes: Cc, interfaces: Ci } = Components;

function waitInitWindow(w) {
  let time = 50;
  return new Promise((resolve, reject) => {
    const _ = () => {
      try {
        if (w.document.readyState === 'complete') {
          resolve(w);
        } else if (time < 3200) {
          setTimeout(_, time);
          time *= 2;
        } else {
          reject(new Error('took too long to init background window (2)'));
        }
      } catch (e) {
        reject(e);
      }
    };
    _();
  });
}

let windowlessBrowser;
let iframe;
let promise;
let listener;
let timer;

export function getBackgroundWindow() {
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error('took too long to init background window (1)'));
      }, 5000);

      const appShell = Cc['@mozilla.org/appshell/appShellService;1']
        .getService(Ci.nsIAppShellService);
      windowlessBrowser = appShell.createWindowlessBrowser(true);
      windowlessBrowser.QueryInterface(Ci.nsIInterfaceRequestor);
      const webProgress = windowlessBrowser.getInterface(Ci.nsIWebProgress);
      const XPCOMUtils = Components.utils.import('resource://gre/modules/XPCOMUtils.jsm', null).XPCOMUtils;

      try {
        listener = {
          QueryInterface: XPCOMUtils.generateQI([
            Ci.nsIWebProgressListener,
            Ci.nsIWebProgressListener2,
            Ci.nsISupportsWeakReference
          ]),
          onStateChange(wbp, request, stateFlags) {
            if (!request) {
              return;
            }
            if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
              webProgress.removeProgressListener(listener);
              listener = null;
              const document = windowlessBrowser.document;
              iframe = document.documentElement.appendChild(
                document.createElementNS('http://www.w3.org/1999/xhtml', 'iframe')
              );
              iframe.setAttribute(
                'src',
                'chrome://cliqz/content/p2p/content/hiddenWindow.html'
              );
              clearTimeout(timer);
              resolve(waitInitWindow(iframe.contentWindow));
            }
          }
        };
        webProgress.addProgressListener(listener, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
        windowlessBrowser.document.location = "data:application/vnd.mozilla.xul+xml;charset=utf-8,<window%20id='cliqzp2p-win'/>";
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });
  }
  return promise;
}

export function destroyBackgroundWindow() {
  clearTimeout(timer);

  if (windowlessBrowser && listener) {
    const webProgress = windowlessBrowser.getInterface(Ci.nsIWebProgress);
    webProgress.removeProgressListener(listener);
  }

  if (iframe) {
    iframe.parentNode.removeChild(iframe);
  }

  if (windowlessBrowser && windowlessBrowser.close) {
    windowlessBrowser.close();
  }
  windowlessBrowser = iframe = promise = listener = timer = null;
}
