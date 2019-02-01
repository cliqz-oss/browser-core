/* eslint-disable no-param-reassign */
/* global PrivateBrowsingUtils */
import { Components } from '../platform/globals';
import { Window } from '../core/browser';
import { loadURIIntoGBrowser, getPrincipalForUrl } from './browser';

const CLIQZEnvironment = {
  Promise,
  SKIN_PATH: 'chrome://cliqz/content/static/skin/',
  prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(''),
  RESULTS_TIMEOUT: 1000, // 1 second

  init() { },

  unload() { },

  isDefaultBrowser() {
    try {
      const shell = Components.classes['@mozilla.org/browser/shell-service;1']
        .getService(Components.interfaces.nsIShellService);
      if (shell) {
        return shell.isDefaultBrowser(false);
      }
    } catch (e) {
      // empty
    }

    return null;
  },
  openLink(win, url, newTab, newWindow, newPrivateWindow, focus) {
    // make sure there is a protocol (this is required
    // for storing it properly in Firefoxe's history DB)
    if (url.indexOf('://') === -1 && url.trim().indexOf('about:') !== 0) {
      url = `http://${url}`;
    }

    // Firefox history boosts URLs that are typed in the URL bar, autocompleted,
    // or selected from the history dropbdown; thus, mark page the user is
    // going to see as "typed" (i.e, the value Firefox would assign to such URLs)
    try {
      const historyService = Components.classes['@mozilla.org/browser/nav-history-service;1'].getService(Components.interfaces.nsINavHistoryService);
      const ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
      const urlObject = ioService.newURI(url, null, null);
      historyService.markPageAsTyped(urlObject);
    } catch (e) {
      // empty
    }

    if (newTab) {
      const tab = win.gBrowser.addTab(url, {
        triggeringPrincipal: getPrincipalForUrl(url)
      });
      if (focus) {
        win.gBrowser.selectedTab = tab;
      }
      return tab;
    }
    if (newWindow) {
      win.open(url, '_blank');
    } else if (newPrivateWindow) {
      win.openLinkIn(url, 'window', {
        triggeringPrincipal: getPrincipalForUrl(url),
        private: true
      });
    } else {
      // Set urlbar value to url immediately
      if (win.CLIQZ.Core.urlbar) {
        win.CLIQZ.Core.urlbar.value = url;
      }
      // win.openUILink(url);
      loadURIIntoGBrowser(win.gBrowser, url);
    }
    return undefined;
  },
  isPrivate(win) {
    // try to get the current active window
    if (!win) {
      win = CLIQZEnvironment.getWindow();
    }

    // return false if we still do not have a window
    if (!win) return false;

    if (win && win.cliqzIsPrivate === undefined) {
      try {
        // Firefox 20+
        Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
        win.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(win);
      } catch (e) {
        Components.utils.reportError(e);
        win.cliqzIsPrivate = true;
      }
    }

    return win.cliqzIsPrivate;
  },

  /**
   * @param {ChromeWindow} win - browser window to check.
   * @return whether |win|'s current tab is in private mode.
  */
  isOnPrivateTab(win) {
    return (
      win
      && win.gBrowser
      && win.gBrowser.selectedBrowser
      && win.gBrowser.selectedBrowser.loadContext.usePrivateBrowsing
    );
  },
  getWindow() {
    const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
    return wm.getMostRecentWindow('navigator:browser');
  },
  getWindowID(win) {
    win = win || CLIQZEnvironment.getWindow();
    return (new Window(win)).id;
  },
  openTabInWindow(win, url, relatedToCurrent = false) {
    win.gBrowser.selectedTab = win.gBrowser.addTab(url, {
      relatedToCurrent,
      triggeringPrincipal: getPrincipalForUrl(url)
    });
  },
  // from ContextMenu
  openPopup(contextMenu, ev, x, y) {
    contextMenu.openPopupAtScreen(x, y, false);
  },
};

export default CLIQZEnvironment;
