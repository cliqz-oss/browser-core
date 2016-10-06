import CliqzHumanWeb from 'human-web/human-web';

Cu.import("resource://gre/modules/Services.jsm");

export let currentURL = CliqzHumanWeb.currentURL;

export function contextFromEvent() {
  return CliqzHumanWeb.contextFromEvent;
}

export function forEachWindow(callback) {
  var enumerator = Services.wm.getEnumerator('navigator:browser');
  while (enumerator.hasMoreElements()) {
    try {
      var win = enumerator.getNext();
      callback(win);
    } catch(e) {}
  }
}

/** Returns true if the give windowID represents an open browser tab's windowID.
 */
export function isWindowActive(windowID) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
  var browserEnumerator = wm.getEnumerator("navigator:browser");
  // ensure an integer as getBrowserForOuterWindowID() is type sensitive
  var int_id = parseInt(windowID);
  if(int_id <= 0) return false;

  while (browserEnumerator.hasMoreElements()) {
    var browserWin = browserEnumerator.getNext();
    var tabbrowser = browserWin.gBrowser;

    // check if tab is open in this window
    // on FF>=39 wm.getOuterWindowWithId() behaves differently to on FF<=38 for closed tabs so we first try
    // gBrowser.getBrowserForOuterWindowID which works on FF>=39, and fall back to wm.getOuterWindowWithId()
    // for older versions.
    try {
      var win = tabbrowser.getBrowserForOuterWindowID(int_id)
      // check for http URI.
      if (win !== undefined) {
        return win.currentURI && (win.currentURI.schemeIs('http') || win.currentURI.schemeIs('https'))
      }
    } catch(e) {
      let tabwindow;
      try {
        tabwindow = wm.getOuterWindowWithId(int_id);
      } catch(e) {
        // if getOuterWindowWithId randomly fails, keep the tab
        return true;
      }
      if(tabwindow == null) {
        return false;
      } else {
        try {
          // check for http URI.
          if (tabwindow.document.documentURI.substring(0, 4) === 'http') {
            let contents = tabwindow.content || tabwindow._content;
            return true;
          } else {
            return false;
          }
        } catch(ee) {
          return false;
        }
      }
    }
  }
  return false;
}
