
export function getCurrentWindow() {
  return Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser');
}

/** Returns true if the give windowID represents an open browser tab's windowID.
 */
export function isWindowActive(windowID) {
  const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator);
  const browserEnumerator = wm.getEnumerator('navigator:browser');

  // the windowID should be an integer
  const numId = Number(windowID);
  if (numId <= 0) {
    return false;
  }

  while (browserEnumerator.hasMoreElements()) {
    const browserWin = browserEnumerator.getNext();
    const tabbrowser = browserWin.gBrowser;

    // check if tab is open in this window
    const win = tabbrowser.getBrowserForOuterWindowID(numId);

    // check for http URI.
    if (win !== undefined) {
      return win.currentURI && (
        win.currentURI.schemeIs('http')
        || win.currentURI.schemeIs('https')
        || win.currentURI.schemeIs('resource')
        || win.currentURI.schemeIs('chrome')
      );
    }
  }

  return false;
}

export function checkIsWindowActive(windowID) {
  return Promise.resolve(isWindowActive(windowID));
}

const windowObservers = new Map();
export function addWindowObserver(callback) {
  const cb = (win, topic) => {
    callback(win, topic === 'domwindowopened' ? 'opened' : 'closed');
  };
  windowObservers.set(callback, cb);
  Services.ww.registerNotification(cb);
}

export function removeWindowObserver(callback) {
  const cb = windowObservers.get(callback);
  if (cb) {
    Services.ww.unregisterNotification(cb);
  }
}


export default {
  onCreated: {
    addListener() {},
    removeListener() {},
  },
  onRemoved: {
    addListener() {},
    removeListener() {},
  },
};
