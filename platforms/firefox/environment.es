/* eslint-disable no-param-reassign */
/* global PrivateBrowsingUtils */

import console from '../core/console';
import prefs from '../core/prefs';
import utils from '../core/utils';
import config from '../core/config';
import { promiseHttpHandler } from '../core/http';
import { Components } from '../platform/globals';
import telemetry from '../core/services/telemetry';
import { isOnionMode } from '../core/platform';
import { Window } from '../core/browser';
import { loadURIIntoGBrowser, getPrincipalForUrl } from './browser';

try {
  Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
  Components.utils.import('resource://gre/modules/NewTabUtils.jsm');
} catch (e) {
  // empty
}

const CLIQZEnvironment = {
  Promise,
  SKIN_PATH: 'chrome://cliqz/content/static/skin/',
  prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(''),
  RESULTS_TIMEOUT: 1000, // 1 second
  BROWSER_ONBOARDING_PREF: 'browserOnboarding',

  init() {},

  unload() {},

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
      const historyService =
        Components.classes['@mozilla.org/browser/nav-history-service;1'].getService(Components.interfaces.nsINavHistoryService);
      const ioService =
        Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
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
    } else if (newWindow) {
      win.open(url, '_blank');
    } else if (newPrivateWindow) {
      win.openLinkIn(url, 'window', { private: true });
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
      win &&
      win.gBrowser !== undefined &&
      win.gBrowser.selectedBrowser !== undefined &&
      win.gBrowser.selectedBrowser.loadContext.usePrivateBrowsing
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
  // TODO: move this
  _trk: [],
  telemetry: (() => {
    let trkTimer = null;
    let telemetrySeq = -1;
    let telemetryReq = null;
    let telemetrySending = [];
    const TELEMETRY_MAX_SIZE = 500;
    function getNextSeq() {
      if (telemetrySeq === -1) {
        telemetrySeq = prefs.get('telemetrySeq', 0);
      }
      telemetrySeq = (telemetrySeq + 1) % 2147483647;
      return telemetrySeq;
    }
    function _pushTelemetryCallback(req) {
      try {
        const response = JSON.parse(req.response);

        if (response.new_session) {
          prefs.set('session', response.new_session);
        }
        telemetrySending = [];
        telemetryReq = null;
      } catch (e) {
        // this can only happen if the callback is called
        // after the extension is turned off
      }
    }
    function _pushTelemetryError() {
      // pushTelemetry failed, put data back in queue to be sent again later
      console.log(`push telemetry failed: ${telemetrySending.length} elements`, 'pushTelemetry');
      CLIQZEnvironment._trk = telemetrySending.concat(CLIQZEnvironment._trk);

      // Remove some old entries if too many are stored,
      // to prevent unbounded growth when problems with network.
      const slicePos = (CLIQZEnvironment._trk.length - TELEMETRY_MAX_SIZE) + 100;
      if (slicePos > 0) {
        console.log(`discarding ${slicePos}old telemetry data`, 'pushTelemetry');
        CLIQZEnvironment._trk = CLIQZEnvironment._trk.slice(slicePos);
      }

      telemetrySending = [];
      telemetryReq = null;
    }
    function pushTelemetry() {
      prefs.set('telemetrySeq', telemetrySeq);
      if (telemetryReq) return;
      // put current data aside in case of failure
      telemetrySending = CLIQZEnvironment._trk.slice(0);
      CLIQZEnvironment._trk = [];

      console.log(`push telemetry data: ${telemetrySending.length} elements`, 'pushTelemetry');

      telemetryReq = promiseHttpHandler('POST', config.settings.STATISTICS, JSON.stringify(telemetrySending), 10000, true);
      telemetryReq.then(_pushTelemetryCallback);
      telemetryReq.catch(_pushTelemetryError);
    }

    return (msg, instantPush) => {
      // no telemetry in private windows & tabs
      if (msg.type !== 'environment' && utils.isPrivateMode()) {
        return;
      }

      if (isOnionMode) {
        return;
      }

      console.log(msg, 'Utils.telemetry');
      if (msg.type !== 'environment' && !telemetry.isEnabled()) {
        return;
      }

      // datareporting.healthreport.uploadEnabled
      CLIQZEnvironment._trk.push({
        session: prefs.get('session'),
        ts: Date.now(),
        seq: getNextSeq(),
        ...msg,
      });
      clearTimeout(trkTimer);
      if (instantPush || CLIQZEnvironment._trk.length % 100 === 0) {
        pushTelemetry();
      } else {
        trkTimer = setTimeout(pushTelemetry, 60000);
      }
    };
  })(),

  // from ContextMenu
  openPopup(contextMenu, ev, x, y) {
    contextMenu.openPopupAtScreen(x, y, false);
  },
};

export default CLIQZEnvironment;
