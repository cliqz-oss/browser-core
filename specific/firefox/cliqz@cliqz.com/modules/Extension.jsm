
'use strict';
/*
 * This module handles the loading and the unloading of the extension
 * It injects all the needed scripts into the chrome context
 *
 */

Components.utils.importGlobalProperties(['crypto'])
var EXPORTED_SYMBOLS = ['Extension'];
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu,
  manager: Cm,
  results: Cr
} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

var SEARCH_BAR_ID = 'search-container',
    dontHideSearchBar = 'dontHideSearchBar',
    //toolbar
    searchBarPosition = 'defaultSearchBarPosition',
    //next element in the toolbar
    searchBarPositionNext = 'defaultSearchBarPositionNext';


function newMajorVersion(oldV, newV){
    var o = oldV.split('.'), n = newV.split('.');
    if(o.length == 3 && n.length == 3){ //only trigger for production versions
        try{
            if(parseInt(o[1]) < parseInt(n[1]))
                return true;
        } catch(e){}
    }
    return false;
}

var CliqzUtils;
var CliqzEvents;

var Extension = {
    modules: [],
    init: function(upgrade, oldVersion, newVersion){
      Extension.unloadJSMs();

      Cu.import('chrome://cliqzmodules/content/CLIQZ.jsm');

      Services.scriptloader.loadSubScript("chrome://cliqz/content/runloop.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqzmodules/content/extern/system-polyfill.js", this);
      Extension.System = this.System;
      Extension.System.normalizeSync = function(modName) {return modName;};
      Extension.System.set('system', { default: Extension.System });
      Extension.System.set('promise', { default: this.Promise });

      Services.scriptloader.loadSubScript("chrome://cliqz/content/bower_components/handlebars/handlebars.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/bower_components/mathjs/dist/math.min.js", this);

      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/xmlhttprequest.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/fetch.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/storage.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/storage.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/prefs.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/prefs.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/console.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/console.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/environment.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/gzip.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/gzip.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/http.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/utils.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/events.js", this);

      Extension.System.set('handlebars', {default: this.Handlebars});
      Extension.System.set('math', {default: this.math});

      var environment = Extension.System.get("platform/environment").default;
      // must be set to this.Promise before anything else is called, so the proper Promise implementation can be used.
      environment.Promise = this.Promise;
      // timers have been attached to this by runloop.js
      environment.setTimeout = this.setTimeout;
      environment.setInterval = this.setInterval;
      environment.clearTimeout = this.clearTimeout;
      environment.clearInterval = this.clearInterval;

      var utils = Extension.System.get("core/utils").default;
      var events = Extension.System.get("core/events").default;
      CLIQZ.System = Extension.System;
      CLIQZ.CliqzUtils = utils;
      CLIQZ.CliqzEvents = events;
      CliqzUtils = utils;
      CliqzUtils.Extension = Extension;
      CliqzEvents = events;

      CliqzUtils.initPlatform(Extension.System)

      CliqzUtils.init({
        lang: CliqzUtils.getPref('general.useragent.locale', 'en', '')
      });
      this.telemetry = CliqzUtils.telemetry;

      CliqzUtils.extensionVersion = newVersion;

      // wait before setting the support info as it uses LocalStorage which might not be accessible
      Extension._SupportInfoTimeout = CliqzUtils.setTimeout(function(){
        CliqzUtils.setSupportInfo()
      }, 30000);

      // Ensure prefs are set to our custom values
      Extension.setOurOwnPrefs();

      // Load Config - Synchronous!
      this.config = {{CONFIG}};
      CliqzUtils.RICH_HEADER = this.config.settings['richheader-url'] || CliqzUtils.RICH_HEADER;
      CliqzUtils.RESULTS_PROVIDER = this. config.settings['resultsprovider-url'] || CliqzUtils.RESULTS_PROVIDER;
      CliqzUtils.FEEDBACK_URL = CliqzUtils.FEEDBACK + CliqzUtils.extensionVersion + '-' + this.config.settings.channel;

      function loadModulesBackground() {
        return Extension.System.import("core/app").then(module => {
          const App = module.default;
          Extension.app = new App();
          return Extension.app.load();
        });
      }
      // Load and initialize modules
      Extension.modulesLoadedPromise = loadModulesBackground()
        .then(function () {
          Extension.cliqzPrefsObserver.register();

          // Load into currently open windows
          var enumerator = Services.wm.getEnumerator('navigator:browser');
          while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.loadIntoWindow(win);
          }

          Services.ww.registerNotification(Extension.windowWatcher);
        })
        .catch(function (e) {
          CliqzUtils.log(e, 'Extension -- failed to init CLIQZ App');
        });


      // Load into all new windows

      Extension.setInstallDatePref();
    },
    shutdown: function () {
      Extension.quickUnloadModules();
    },

    disable: function (version) {
      CliqzUtils.setSupportInfo("disabled")

      var win  = Services.wm.getMostRecentWindow("navigator:browser");

      try{
          Extension.restoreSearchBar(win);
          Extension.resetOriginalPrefs();
          showUninstallMessage(win, version);
      } catch(e){}
    },

    // for legacy users who have not set install date on installation
    setInstallDatePref: function () {
      try {
        if (!CliqzUtils.getPref('install_date')) {
          Cu.import('resource://gre/modules/AddonManager.jsm');
          AddonManager.getAddonByID("cliqz@cliqz.com", function () {
            var date = Math.floor(arguments[0].installDate.getTime() / 86400000);
            CliqzUtils.setPref('install_date', date);
          });
        }
      } catch (ex) {
        CliqzUtils.log('Unable to set install date');
      }
    },

    unload: function () {
        CliqzUtils.clearTimeout(Extension._SupportInfoTimeout)

        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        Extension.unloadModules();

        Services.ww.unregisterNotification(Extension.windowWatcher);

        Extension.cliqzPrefsObserver.unregister();

        this.cliqzRunloop.stop();

        Extension.unloadJSMs();
    },
    restoreSearchBar: function(win){
        var toolbarId = CliqzUtils.getPref(searchBarPosition, '');
        CliqzUtils.setPref(dontHideSearchBar, false);
        if(toolbarId){
            var toolbar = win.document.getElementById(toolbarId);
            if(toolbar){
                if(toolbar.currentSet.indexOf(SEARCH_BAR_ID) === -1){
                    var next = CliqzUtils.getPref(searchBarPositionNext, '');
                    if(next){
                        var set = toolbar.currentSet.split(","),
                            idx = set.indexOf(next);

                        if (idx != -1)
                            set.splice(idx, 0, SEARCH_BAR_ID);
                        else set.push(SEARCH_BAR_ID);

                        toolbar.currentSet = set.join(",");
                    }
                    // no next element, append it to the end
                    else toolbar.currentSet += ',' + SEARCH_BAR_ID;
                } else {
                    //the user made it visible
                    CliqzUtils.setPref(dontHideSearchBar, true);
                }
            }
        }
    },
    quickUnloadModules: function () {
      Extension.app.unload({ quick: true });
    },
    unloadModules: function () {
      Extension.app.unload();
    },
    unloadJSMs: function () {
        //unload all cliqz modules
        Cu.unload('chrome://cliqzmodules/content/CLIQZ.jsm');
    },
    restart: function(){
        CliqzUtils.extensionRestart();
    },
    loadIntoWindow: function(win) {
      if (!win) return;

      function load() {
        Extension.modulesLoadedPromise
          .then(function () {
            CliqzUtils.log('Extension CLIQZ App background loaded');
            return Extension.app.loadWindow(win);
          })
          .catch(function (e) {
            CliqzUtils.log(e, 'Extension filed loaded window modules');
          });
      }

      if (!win.document || win.document.readyState !== "complete") {
        win.addEventListener('load', function loader() {
          win.removeEventListener('load', loader, false);
          if (win.location.href == 'chrome://browser/content/browser.xul') {
            load();
          }
        }, false);
      } else {
        load();
      }
    },
    unloadFromWindow: function(win){
        //unload core even if the window closes to allow all modules to do their cleanup
        if (win.location.href !== 'chrome://browser/content/browser.xul') {
            return;
        }

        try {
          Extension.app.unloadWindow(win);

          // count the number of opened windows here and send it to events
          // if the last window was closed then remaining == 0.
          var enumerator = Services.wm.getEnumerator('navigator:browser');
          var remainingWin = 0;
          while (enumerator.hasMoreElements()) {
            var dummyWin = enumerator.getNext();
            remainingWin += 1;
          }
          CliqzEvents.pub('core.window_closed', {remaining: remainingWin});

        } catch(e) {
            Cu.reportError(e);
        }
    },
    windowWatcher: function(win, topic) {
        if (topic === 'domwindowopened') {
            Extension.loadIntoWindow(win, true);
        } else if(topic === 'domwindowclosed') {
            Extension.unloadFromWindow(win);
        }
    },
    /** Change some prefs for a better cliqzperience -- always do a backup! */
    setOurOwnPrefs: function() {
        var urlBarPref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        if (!CliqzUtils.hasPref("maxRichResultsBackup")) {
            CliqzUtils.setPref("maxRichResultsBackup",
                urlBarPref.getIntPref("maxRichResults"));
            urlBarPref.setIntPref("maxRichResults", 30);
        }

        var unifiedComplete = urlBarPref.getPrefType("unifiedcomplete");
        if(unifiedComplete == 128 && urlBarPref.getBoolPref("unifiedcomplete") == true){
          CliqzUtils.setPref('unifiedcomplete', true);
          urlBarPref.setBoolPref("unifiedcomplete", false)
        }
    },
    /** Reset changed prefs on uninstall */
    resetOriginalPrefs: function() {
        var urlBarPref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
        var cliqzBackup = CliqzUtils.getPref("maxRichResultsBackup");
        if (cliqzBackup) {
            CliqzUtils.log("Loading maxRichResults backup...", "CliqzUtils.setOurOwnPrefs");
            urlBarPref.setIntPref("maxRichResults",
                CliqzUtils.getPref("maxRichResultsBackup"));

            CliqzUtils.clearPref("maxRichResultsBackup", 0);
        } else {
            CliqzUtils.log("maxRichResults backup does not exist; doing nothing.", "CliqzUtils.setOurOwnPrefs")
        }

        if(CliqzUtils.getPref('unifiedcomplete', false)){
          urlBarPref.setBoolPref("unifiedcomplete", true);
          CliqzUtils.setPref('unifiedcomplete', false);
        }
    },
    cliqzPrefsObserver: {
      register: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                    .getService(Components.interfaces.nsIPrefService);
        this.branch = prefService.getBranch('extensions.cliqz.');
        if (!("addObserver" in this.branch)) {
          this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
        }
        this.branch.addObserver("", this, false);
      },
      unregister: function() {
        this.branch.removeObserver("", this);
      },
      observe: function(subject, topic, data) {
        CliqzEvents.pub('prefchange', data);
      }
    }
};

function showUninstallMessage(window, currentVersion) {
  const gBrowser = window.gBrowser;
  const UNINSTALL_PREF = 'uninstallVersion';
  const lastUninstallVersion = CliqzUtils.getPref(UNINSTALL_PREF, '');

  if (currentVersion && (lastUninstallVersion !== currentVersion)) {
    CliqzUtils.setPref(UNINSTALL_PREF, currentVersion);
    gBrowser.selectedTab = gBrowser.addTab(CliqzUtils.UNINSTALL);
  }
}
