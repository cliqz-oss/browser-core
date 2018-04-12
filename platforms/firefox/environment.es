/* eslint-disable no-param-reassign */
/* global PrivateBrowsingUtils */

import console from '../core/console';
import prefs from '../core/prefs';
import utils from '../core/utils';
import { isCliqzBrowser } from '../core/platform';
import { promiseHttpHandler } from '../core/http';
import { Components, Services } from '../platform/globals';

// TODO: please just use Components
const {
  utils: Cu,
  interfaces: Ci,
  classes: Cc,
} = Components;

try {
  Cu.import('resource://gre/modules/XPCOMUtils.jsm');
  Cu.import('resource://gre/modules/NewTabUtils.jsm');
} catch (e) {
  // empty
}

const CLIQZEnvironment = {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  Promise,
  TEMPLATES_PATH: 'chrome://cliqz/content/static/templates/',
  SKIN_PATH: 'chrome://cliqz/content/static/skin/',
  prefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch(''),
  RERANKERS: [],
  RESULTS_TIMEOUT: 1000, // 1 second
  TEMPLATES: {},
  MESSAGE_TEMPLATES: [],
  PARTIALS: [],
  CLIQZ_ONBOARDING: 'about:onboarding',
  CLIQZ_ONBOARDING_URL: 'chrome://cliqz/content/onboarding-v3/index.html',
  BASE_CONTENT_URL: 'chrome://cliqz/content/',
  BROWSER_ONBOARDING_PREF: 'browserOnboarding',

  init() {},

  unload() {},

  getAllCliqzPrefs() {
    return Cc['@mozilla.org/preferences-service;1']
      .getService(Ci.nsIPrefService)
      .getBranch('extensions.cliqz.')
      .getChildList('');
  },

  isUnknownTemplate(template) {
    return template &&
      CLIQZEnvironment.TEMPLATES.hasOwnProperty.call(CLIQZEnvironment, template) === false;
  },
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
        Cc['@mozilla.org/browser/nav-history-service;1'].getService(Ci.nsINavHistoryService);
      const ioService =
        Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
      const urlObject = ioService.newURI(url, null, null);
      historyService.markPageAsTyped(urlObject);
    } catch (e) {
      // empty
    }

    if (newTab) {
      const tab = win.gBrowser.addTab(url);
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
      win.gBrowser.loadURI(url);
    }
    return undefined;
  },
  copyResult(val) {
    const gClipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1'].getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(val);
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
        Cu.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
        win.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(win);
      } catch (e) {
        // pre Firefox 20
        try {
          win.cliqzIsPrivate = Cc['@mozilla.org/privatebrowsing;1']
            .getService(Ci.nsIPrivateBrowsingService)
            .privateBrowsingEnabled;
        } catch (ex) {
          Cu.reportError(ex);
          win.cliqzIsPrivate = true;
        }
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
    const wm = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator);
    return wm.getMostRecentWindow('navigator:browser');
  },
  getWindowID(win) {
    win = win || CLIQZEnvironment.getWindow();
    const util = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    return util.outerWindowID;
  },
  openTabInWindow(win, url, relatedToCurrent = false) {
    win.gBrowser.selectedTab = win.gBrowser.addTab(url, { relatedToCurrent });
  },
  // TODO: move this
  trk: [],
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
    function pushTelemetryCallback(req) {
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
    function pushTelemetryError() {
      // pushTelemetry failed, put data back in queue to be sent again later
      console.log(`push telemetry failed: ${telemetrySending.length} elements`, 'pushTelemetry');
      CLIQZEnvironment.trk = telemetrySending.concat(CLIQZEnvironment.trk);

      // Remove some old entries if too many are stored,
      // to prevent unbounded growth when problems with network.
      const slicePos = (CLIQZEnvironment.trk.length - TELEMETRY_MAX_SIZE) + 100;
      if (slicePos > 0) {
        console.log(`discarding ${slicePos}old telemetry data`, 'pushTelemetry');
        CLIQZEnvironment.trk = CLIQZEnvironment.trk.slice(slicePos);
      }

      telemetrySending = [];
      telemetryReq = null;
    }
    function pushTelemetry() {
      prefs.set('telemetrySeq', telemetrySeq);
      if (telemetryReq) return;
      // put current data aside in case of failure
      telemetrySending = CLIQZEnvironment.trk.slice(0);
      CLIQZEnvironment.trk = [];

      console.log(`push telemetry data: ${telemetrySending.length} elements`, 'pushTelemetry');

      telemetryReq = promiseHttpHandler('POST', utils.STATISTICS, JSON.stringify(telemetrySending), 10000, true);
      telemetryReq.then(pushTelemetryCallback);
      telemetryReq.catch(pushTelemetryError);
    }

    return (msg, instantPush) => {
      // no telemetry in private windows & tabs
      if (msg.type !== 'environment' && utils.isPrivateMode()) {
        return;
      }

      console.log(msg, 'Utils.telemetry');
      // telemetry in all products can be turned off using the 'telemetry' pref
      if (!prefs.get('telemetry', true)) return;

      // for the Cliqz browser we also turn off the extension telemetry
      // if the user opts-out from the browser health report
      if (isCliqzBrowser &&
        msg.type !== 'environment' && // TEMP: we only let the environment signal go though
        (prefs.get('uploadEnabled', true, 'datareporting.healthreport.') !== true)) {
        return;
      }
      // datareporting.healthreport.uploadEnabled
      msg.session = prefs.get('session');
      msg.ts = Date.now();
      msg.seq = getNextSeq();

      CLIQZEnvironment.trk.push(msg);
      CLIQZEnvironment.clearTimeout(trkTimer);
      if (instantPush || CLIQZEnvironment.trk.length % 100 === 0) {
        pushTelemetry();
      } else {
        trkTimer = CLIQZEnvironment.setTimeout(pushTelemetry, 60000);
      }
    };
  })(),
  _isSearchServiceInitialized: (() => {
    if (Services.search.init) {
      Services.search.init(() => {
        CLIQZEnvironment._isSearchServiceInitialized = true;
      });
      return false;
    }
    return true;
  })(),
  getDefaultSearchEngine() {
    const searchEngines = CLIQZEnvironment.getSearchEngines();
    return searchEngines.filter(se => se.default)[0];
  },
  getSearchEngines(blackListed = []) {
    const SEARCH_ENGINES = CLIQZEnvironment._isSearchServiceInitialized ?
      {
        defaultEngine: Services.search.defaultEngine,
        engines: Services.search.getEngines()
      } : {
        defaultEngine: null,
        engines: []
      };

    return SEARCH_ENGINES.engines
      .filter(e => !e.hidden && e.iconURI != null && blackListed.indexOf(e.name) < 0)
      .map(e => ({
        name: e.name,
        alias: e.alias,
        default: e === SEARCH_ENGINES.defaultEngine,
        icon: e.iconURI.spec,
        base_url: e.searchForm,
        urlDetails: utils.getDetailsFromUrl(e.searchForm),
        getSubmissionForQuery(q, type) {
          // 'keyword' is used by one of the Mozilla probes
          // to measure source for search actions
          // https://dxr.mozilla.org/mozilla-central/rev/e4107773cffb1baefd5446666fce22c4d6eb0517/browser/locales/searchplugins/google.xml#15
          const submission = e.getSubmission(q, type, 'keyword');

          // some engines cannot create submissions for all types
          // eg 'application/x-suggestions+json'
          if (submission) {
            return submission.uri.spec;
          }
          return null;
        }
      })
      );
  },
  _waitForSearchService() {
    return Services.search.init ?
      new Promise(resolve => Services.search.init(resolve)) :
      Promise.resolve();
  },
  updateAlias(name, newAlias) {
    CLIQZEnvironment._waitForSearchService().then(() => {
      Services.search.getEngineByName(name).alias = newAlias;
    });
  },
  getEngineByAlias(alias) {
    return CLIQZEnvironment.getSearchEngines().find(engine => engine.alias === alias);
  },
  getEngineByName(name) {
    return CLIQZEnvironment.getSearchEngines().find(engine => engine.name === name);
  },
  addEngineWithDetails(engine) {
    CLIQZEnvironment._waitForSearchService().then(() => {
      const existedEngine = Services.search.getEngineByName(engine.name);
      if (existedEngine) {
        // Update the engine alias in case it has been removed
        if (!existedEngine.alias) {
          existedEngine.alias = engine.key;
        }

        return;
      }

      Services.search.addEngineWithDetails(
        engine.name,
        engine.iconURL,
        engine.key,
        engine.name,
        engine.method,
        engine.url
      );
      if (engine.encoding) {
        Services.search.getEngineByName(engine.name)
          .wrappedJSObject._queryCharset = engine.encoding;
      }
    });
  },

  restoreHiddenSearchEngines() {
    // YouTube - special case
    const SEARCH_ENGINE_ALIAS = {
      youtube: '#yt',
      'youtube-de': '#yt',
    };
    CLIQZEnvironment._waitForSearchService().then(() => {
      Services.search.getEngines().forEach((e) => {
        if (e.hidden === true) {
          e.hidden = false;
          // Restore the alias as well
          if (!e.alias && e.identifier) {
            if (SEARCH_ENGINE_ALIAS[e.identifier]) {
              e.alias = SEARCH_ENGINE_ALIAS[e.identifier];
            } else {
              e.alias = `#${e.identifier.toLowerCase().substring(0, 2)}`;
            }
          }
        }
      });
    });
  },
  /*
      We want to remove the search engine in order to update it by addEngineWithDetails function
      If the search engines are stored in user profile, we can remove them
    */
  removeEngine(name) {
    let engine = Services.search.getEngineByName(name);
    if (engine) {
      Services.search.removeEngine(engine);
    }
    // Check if the engine has been removed or not
    engine = Services.search.getEngineByName(name);
    // If not, search engines cannot be removed since they are stored in global location
    // removeEngine will just hide the engine, we can restore it by unhiding it
    if (engine) {
      engine.hidden = false;
    }
  },
  // from ContextMenu
  openPopup(contextMenu, ev, x, y) {
    contextMenu.openPopupAtScreen(x, y, false);
  },
  /**
     * Construct a uri from a url
     * @param {string}  aUrl - url
     * @param {string}  aOriginCharset - optional character set for the URI
     * @param {nsIURI}  aBaseURI - base URI for the spec
     */
  makeUri(aUrl, aOriginCharset, aBaseURI) {
    let uri;
    try {
      uri = Services.io.newURI(aUrl, aOriginCharset, aBaseURI);
    } catch (e) {
      uri = null;
    }
    return uri;
  },
  getNoResults(q) {
    const res = CLIQZEnvironment.Result.cliqz(
      {
        template: 'noResult',
        snippet: {},
        type: 'rh',
        subType: { empty: true }
      },
      q
    );

    return res;
  }
};

export default CLIQZEnvironment;
