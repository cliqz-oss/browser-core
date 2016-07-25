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

var BTN_ID = 'cliqz-button',
    SEARCH_BAR_ID = 'search-container',
    firstRunPref = 'firstStartDone',
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

var Extension = {
    modules: [],
    init: function(){
        Extension.unloadJSMs();

        Services.scriptloader.loadSubScript("chrome://cliqzmodules/content/extern/system-polyfill.js");
        Extension.System = System;

        Cu.import('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzABTests.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzResultProviders.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzEvents.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

        CliqzUtils.initPlatform(System)

        Extension.setDefaultPrefs();
        CliqzUtils.init();
        CLIQZEnvironment.init();
        CliqzLanguage.init();
        if(Services.search.init != null){
          Services.search.init(function(){
            CliqzResultProviders.init();
          });
        } else {
          CliqzResultProviders.init();
        }
        CliqzABTests.init(System);
        this.telemetry = CliqzUtils.telemetry;
    },
    load: function(upgrade, oldVersion, newVersion){
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

      // Load and initialize modules
      Extension.modulesLoadedPromise = Promise.all(
        Extension.config.modules.map(function (moduleName) {
          return new Promise(function (resolve, reject) {
            Extension.System.import(moduleName+"/background")
                     .then(function (module) { module.default.init(Extension.config.settings); resolve(); })
                     .catch(function (e) { CliqzUtils.log("Error on loading module: "+moduleName+" - "+e.toString()+" -- "+e.stack, "Extension"); resolve(); })
          });
        })
      ).then(function () {
        Extension.cliqzPrefsObserver.register();
      }).catch(function (e) {
        CliqzUtils.log("some modules failed to load - " + e, "Extension");
      });

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

        CLIQZEnvironment.unload();
        CliqzABTests.unload();
        CliqzLanguage.unload();

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
        Cu.unload('chrome://cliqzmodules/content/extern/math.min.jsm');
        Cu.unload('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzABTests.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzWikipediaDeduplication.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzLanguage.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCalculator.jsm');
        Cu.unload('chrome://cliqzmodules/content/UrlCompare.jsm');
        Cu.unload('chrome://cliqzmodules/content/Mixer.jsm');
        Cu.unload('chrome://cliqzmodules/content/Result.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzResultProviders.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSpellCheck.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryCluster.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHandlebars.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzEvents.jsm');
        Cu.unload('chrome://cliqzmodules/content/extern/handlebars-v4.0.4.js');
        Cu.unload('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');
        Cu.unload('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzDemo.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzMsgCenter.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRequestMonitor.jsm');
    },
    restart: function(){
        CliqzUtils.extensionRestart();
    },
    setDefaultPrefs: function() {
      //TODO: cleaning prefs?
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(CLIQZEnvironment.SYSTEM_BASE_URL + src + '.js', win);
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
          Extension.addScript('ContextMenu', win);

          Extension.addButtons(win);

          try {
            win.CLIQZ.Core.init();
            CliqzUtils.log('Initialized', 'CORE');

            // Always set urlbar and start whoAmI
            // We need the urlbar, so that we can activate cliqz from a different window that was already open at the moment of deactivation
            win.CLIQZ.Core.urlbar = win.document.getElementById('urlbar');
            win.CLIQZ.Core.whoAmI(true); //startup
            CliqzABTests.check();
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
    addButtons: function(win){
        var doc = win.document;
        if (!CliqzUtils.PREFERRED_LANGUAGE) {
          // Need locale when cliqz is disabled
          var nav = win.navigator;
          CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en';
          CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
        }
        var firstRunPrefVal = CliqzUtils.getPref(firstRunPref, false);
        if (!firstRunPrefVal) {
            CliqzUtils.setPref(firstRunPref, true);

            ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!CliqzUtils.getPref(dontHideSearchBar, false)) {
            //try to hide quick search
            try{
                var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
                if(toolbarID){
                    CliqzUtils.setPref(searchBarPosition, toolbarID);
                }
                if(nextEl){
                    CliqzUtils.setPref(searchBarPositionNext, nextEl);
                }
                CliqzUtils.setPref(dontHideSearchBar, true);
            } catch(e){}
        }

        // cliqz button
        let button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', BTN_ID);
        button.setAttribute('type', 'menu-button');
        button.setAttribute('label', 'CLIQZ');
        button.setAttribute('tooltiptext', 'CLIQZ');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'cliqz_btn.svg)';

        var menupopup = doc.createElement('menupopup');
        menupopup.setAttribute('id', 'cliqz_menupopup');
        button.appendChild(menupopup);

        menupopup.addEventListener('popupshowing', function(){
            Extension.createMenuifEmpty(win, menupopup);
            CliqzUtils.telemetry({
              type: 'activity',
              action: 'cliqz_menu_button',
              button_name: 'main_menu'
            });
        });
        button.addEventListener('command', function(ev) {
            Extension.createMenuifEmpty(win, menupopup);
            button.children[0].openPopup(button,"after_start", 0, 0, false, true);
        }, false);

        ToolbarButtonManager.restorePosition(doc, button);
    },
    // creates the menu items at first click
    createMenuifEmpty: function(win, menupopup){
        if(menupopup.children.length > 0) return;
        //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIBrowserSearchService#moveEngine()
        //FF16+
        if(Services.search.init != null){
            Services.search.init(function(){
                win.CLIQZ.Core.createQbutton(menupopup);
            });
        } else {
            win.CLIQZ.Core.createQbutton(menupopup);
        }
    },
    unloadFromWindow: function(win){
        //unload core even if the window closes to allow all modules to do their cleanup
        if (win.location.href !== 'chrome://browser/content/browser.xul') {
            return;
        }

        try {
          if(win && win.document){
              var btn = win.document.getElementById('cliqz-button');
              if (btn) {
                  btn.parentNode.removeChild(btn);
              }
          }

          win.CLIQZ.Core.unload(false);
          delete win.CLIQZ.Core;
          delete win.CLIQZ.UI;
          delete win.CLIQZ.ContextMenu;

          try {
              delete win.CLIQZ;
          } catch(e) {
              //fails at updating from version < 0.6.11
          }
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
