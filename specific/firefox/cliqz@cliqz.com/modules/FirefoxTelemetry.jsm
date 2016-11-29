"use strict";

this.EXPORTED_SYMBOLS = [
  "FirefoxTelemetry"
];

const ADDON_ID = "cliqz@cliqz.com";
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/BrowserUITelemetry.jsm");

var gBrowsers = null;

this.FirefoxTelemetry = Object.freeze({
  init() {
    if (gBrowsers) {
      Cu.reportError("FirefoxTelemetry.init() was invoked multiple times?");
      return;
    }

    gBrowsers = new Set();
    getBrowserWindows();
    Services.ww.registerNotification(this);
  },

  destroy() {
    if (!gBrowsers) {
      Cu.reportError("FirefoxTelemetry.destroy() was invoked multiple times?");
      return;
    }

    Services.ww.unregisterNotification(this);
    for (let browser of gBrowsers) {
      browser.destroy();
    }
    gBrowsers.clear();
    gBrowsers = null;
  },

  observe(subject, topic, data) {
    let win = subject.QueryInterface(Ci.nsIDOMWindow);
    if (!win) {
      return;
    }

    if (topic == "domwindowopened") {
      whenWindowLoaded(win, () => {
        if (isValidBrowserWindow(win)) {
          gBrowsers.add(new Browser(win));
        }
      });
    } else if (topic == "domwindowclosed") {
      for (let browser of gBrowsers) {
        if (browser.window == win) {
          browser.destroy();
          gBrowsers.delete(browser);
          break;
        }
      }
    }
  },

  reportTelemetryValue(key, optionalData={}) {
    reportTelemetryValue(key, optionalData);
  }
});

function Browser(win, branch) {
  this.window = win;

  win.gBrowser.addProgressListener(this);
}

Browser.prototype = {
  get document() {
    return this.window.document;
  },

  destroy() {
    this.window.gBrowser.removeProgressListener(this);
  },

  onLocationChange(webProgress, request, uri, flags) {
    try {
      if (webProgress.isTopLevel && uri.host) {
        let host = uri.host.replace(/^www./, "").replace(/^search./, "");
        if (gEngines.has(host)) {
          let rv = Services.search.parseSubmissionURL(uri.spec);
          // HACK: try to not count result pages we generated and subpages.
          // This is tricky and working until the engines keep same param names.
          if (rv.engine &&
              !["hspart=mozilla", // Yahoo tracking
                "&b=",            // Yahoo paging
                "client=firefox", // Google tracking
                "&start=",        // Google paging
                "pc=MOZI",        // Bing tracking
                "&first=",        // Bing paging
               ].some(str => uri.path.includes(str))) {
            reportTelemetryValue("userVisitedEngineResult",
                                 { engine: rv.engine });
          }
        }
      }
    } catch (ex) {}
  },
  onProgressChange() {},
  onSecurityChange() {},
  onStateChange(webProgress, request, flags, status) {
    try {
      if (webProgress.isTopLevel &&
          flags & Ci.nsIWebProgressListener.STATE_START &&
          flags & Ci.nsIWebProgressListener.STATE_IS_NETWORK &&
          (request && (request instanceof Ci.nsIChannel || "URI" in request)) &&
          request.URI.path == "/") {
        let host = request.URI.host.replace(/^www./, "").replace(/^search./, "");
        if (gEngines.has(host)) {
          reportTelemetryValue("userVisitedEngineHost",
                               { engine: gEngines.get(host) });
        }
      }
    } catch (ex) {}
  },
  onStatusChange() {},

  QueryInterface: XPCOMUtils.generateQI([ Ci.nsIWebProgressListener ])
};

XPCOMUtils.defineLazyGetter(this, "gEngines", () => {
  let engines = new Map();
  for (let engineName of [ "Google", "Yahoo", "Bing"]) {
    let engine = Services.search.getEngineByName(engineName);
    if (engine) {
      try {
        let engineHost = Services.io.newURI(engine.searchForm, null, null).host;
        engines.set(engineHost.replace(/^www./, "").replace(/^search./, ""),
                    engine);
      } catch (ex) {}
    }
  }
  return engines;
});

function isValidBrowserWindow(win) {
  return !win.closed && win.toolbar.visible &&
          win.document.documentElement.getAttribute("windowtype") == "navigator:browser";
}

function getBrowserWindows() {
  let wins = Services.ww.getWindowEnumerator();
  while (wins.hasMoreElements()) {
    let win = wins.getNext().QueryInterface(Ci.nsIDOMWindow);
    whenWindowLoaded(win, () => {
      if (isValidBrowserWindow(win)) {
        gBrowsers.add(new Browser(win));
      }
    });
  }
}

function whenWindowLoaded(win, callback) {
  if (win.document.readyState == "complete") {
    callback();
    return;
  }
  win.addEventListener("load", function onLoad(event) {
    if (event.target == win.document) {
      win.removeEventListener("load", onLoad, true);
      win.setTimeout(callback, 0);
    }
  }, true);
}

/**
 * Registers the presence of an event.
 *
 * @param eventName The data is logged with this name.
 */
function reportTelemetryValue(key, optionalData = { engine: Services.search.currentEngine }) {
  function sendMetric(payload) {
    const subject = {
      wrappedJSObject: {
        observersModuleSubjectWrapper: true,
        object: ADDON_ID,
      },
    };
    const topic = 'testpilot::send-metric';
    Services.obs.notifyObservers(subject, topic, JSON.stringify(payload));
  }
  const session = Services.prefs.getCharPref("extensions.cliqz.session");
  const payload = { "cliqzSession": session };

  switch(key) {
    case "cliqzInstalled":
      sendMetric(payload);
      break;
    case "userVisitedEngineHost":
      payload.contentSearch = optionalData.engine.name.toLowerCase();
      sendMetric(payload);
      break;
    case "userVisitedEngineResult":
      payload.contentSearchResult = optionalData.engine.name.toLowerCase();
      sendMetric(payload);
      break;
    default:
      Cu.reportError("reportTelemetryValue() got an unknown value");
  }
}
