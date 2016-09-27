'use strict';
/*
 * This module handles the loading and the unloading of the extension
 * It injects all the needed scripts into the chrome context
 *
 */

var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.unload('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

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

      Services.scriptloader.loadSubScript("chrome://cliqz/content/platform/environment.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/utils.js", this);
      Services.scriptloader.loadSubScript("chrome://cliqz/content/core/events.js", this);

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
      CliqzEvents = events;

      Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
      Cu.import('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
      Cu.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

      CliqzUtils.initPlatform(Extension.System)

      Extension.setDefaultPrefs();

      CliqzUtils.init({
        lang: CliqzUtils.getPref('general.useragent.locale', 'en', '')
      });
      CliqzLanguage.init();
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

      function startAbTests() {
        return Extension.System.import("core/ab-tests").then(function (ab) {
          ab.default.init();
        });
      }

      function loadModulesBackground() {
        return Promise.all(
          Extension.config.modules.map(function (moduleName) {
            return Extension.System.import(moduleName+"/background")
              .then(function (module) {
                return module.default.init(Extension.config.settings);
              }).catch(function (e) {
                CliqzUtils.log("Error on loading module: "+moduleName+" - "+e.toString()+" -- "+e.stack, "Extension");
              });
          })
        );
      }
      // Load and initialize modules
      Extension.modulesLoadedPromise = startAbTests()
        .then(loadModulesBackground)
        .then(function () {
          Extension.cliqzPrefsObserver.register();
          CliqzHistoryManager.init();
        })

      // Load into currently open windows
      var enumerator = Services.wm.getEnumerator('navigator:browser');
      while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        Extension.loadIntoWindow(win);
      }

      // Load into all new windows
      Services.ww.registerNotification(Extension.windowWatcher);
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
          win.CLIQZ.Core.showUninstallMessage(version);
      } catch(e){}
    },

    unload: function () {
        Extension.unloadModules();

        CliqzUtils.clearTimeout(Extension._SupportInfoTimeout)

        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        Services.ww.unregisterNotification(Extension.windowWatcher);

        Extension.cliqzPrefsObserver.unregister();

        this.cliqzRunloop.stop();
        CliqzLanguage.unload();
        CliqzHistoryManager.unload();

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
        this.config.modules.slice(0).reverse().forEach(function (moduleName) {
            try {
                Extension.System.get(moduleName+"/background")
                                .default.beforeBrowserShutdown();
            } catch(e) {
              CliqzUtils.log(e.toString()+" -- "+e.stack, "Error quick unloading module: "+moduleName);
            }
        });
    },
    unloadModules: function () {
        this.config.modules.slice(0).reverse().forEach(function (moduleName) {
            try {
                Extension.System.get(moduleName+"/background")
                                .default.unload();
            } catch(e) {
              CliqzUtils.log(e.toString()+" -- "+e.stack, "Error unloading module: "+moduleName);
            }
        });
    },
    unloadJSMs: function () {
        //unload all cliqz modules
        Cu.unload('chrome://cliqzmodules/content/CliqzPlacesAutoComplete.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzLanguage.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzDemo.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzMsgCenter.jsm');
        Cu.unload('chrome://cliqzmodules/content/CLIQZ.jsm');
    },
    restart: function(){
        CliqzUtils.extensionRestart();
    },
    setDefaultPrefs: function() {
      //TODO: cleaning prefs?
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(CliqzUtils.SYSTEM_BASE_URL + src + '.js', win);
    },
    setupCliqzGlobal: function (win) {
      if(win.CLIQZ === undefined) {
          Object.defineProperty( win, 'CLIQZ', {configurable:true, value:{}});
      } else {
          try{
              //faulty uninstall of previous version
              win.CLIQZ = win.CLIQZ || {};
          } catch(e){}
      }
      win.CLIQZ.System = Extension.System;
      win.CLIQZ.config = this.config;
    },
    loadIntoWindow: function(win) {
      if (!win) return;

      function load() {
        Extension.modulesLoadedPromise.then(function () {
          Extension.setupCliqzGlobal(win);
          Extension.addScript('core', win);

          try {
            win.CLIQZ.Core.init();
            CliqzUtils.log('Initialized', 'CORE');

            // Always set urlbar and start whoAmI
            // We need the urlbar, so that we can activate cliqz from a different window that was already open at the moment of deactivation
            win.CLIQZ.Core.urlbar = win.document.getElementById('urlbar');
            win.CLIQZ.Core.whoAmI(true); //startup
          } catch(e) {
            Cu.reportError(e);
          }
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
          win.CLIQZ.Core.unload(false);
          delete win.CLIQZ.CliqzUtils;
          delete win.CLIQZ.CliqzEvents;
          delete win.CLIQZ.Core;
          delete win.CLIQZ.UI;
          delete win.CLIQZ;

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
