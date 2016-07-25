'use strict';
/*
 * This is the core part of the extension.
 *  - it is injected into each browser window
 *  - loads all the additional modules needed
 *  - changes the default search provider
 *  - ovverides the default UI
 *
 */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryCluster',
  'chrome://cliqzmodules/content/CliqzHistoryCluster.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzDemo',
  'chrome://cliqzmodules/content/CliqzDemo.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSearchHistory',
  'chrome://cliqzmodules/content/CliqzSearchHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRedirect',
  'chrome://cliqzmodules/content/CliqzRedirect.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZEnvironment',
  'chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

var gBrowser = gBrowser || CliqzUtils.getWindow().gBrowser;
var Services = Services || CliqzUtils.getWindow().Services;

var locationListener = {
  QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

  onLocationChange: function(aBrowser, aRequest, aURI) {
    CliqzEvents.pub("core.location_change", aURI.spec);
  }
};

var tabsProgressListener = {
  QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
  wplFlag: { //nsIWebProgressListener state transition flags
    STATE_START: Components.interfaces.nsIWebProgressListener.STATE_START,
    STATE_IS_DOCUMENT: Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT,
  },

  onLocationChange: function (aBrowser, aProgress, aRequest, aURI) {
    CliqzEvents.pub("core.tab_location_change", {
      url: aURI && aURI.spec,
      isLoadingDocument: aProgress.isLoadingDocument,
      document: aProgress.document
    });
  },

  onStateChange: function (aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) {
    if (aRequest) {
      try {
        CliqzEvents.pub("core.tab_state_change", {
          url: aRequest && aRequest.name,
          urlSpec: aRequest && aRequest.URI && aRequest.URI.spec,
          isValid: (aStateFlag & this.wplFlag.STATE_START) && !aStatus,
          isNewPage: (this.wplFlag.STATE_START & aStateFlag) && (this.wplFlag.STATE_IS_DOCUMENT & aStateFlag),
          windowID: aWebProgress.DOMWindowID
        });
      } catch (e) {
      }
    }
  }
};

window.CLIQZ.Core = {
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    windowModules: [],
    eventListeners: [],
    init: function(){
        CliqzRedirect.addHttpObserver();
        CliqzUtils.init(window);

        CliqzSpellCheck.init();

        var windowModuleConfig = {
          onInstall: !this.checkSession(),
          settings: CLIQZ.config.settings,
          window: window,
        };

        this.tabChange = CliqzSearchHistory.tabChanged.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabSelect", this.tabChange, false);

        gBrowser.addProgressListener(locationListener);
        gBrowser.addTabsProgressListener(tabsProgressListener);

        this.tabRemoved = CliqzSearchHistory.tabRemoved.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabClose", this.tabRemoved, false);

        // windowModules should be in same order as config.modules
        this.windowModules = new Array(CLIQZ.config.modules.length);

        var windowModulePromises = CLIQZ.config.modules.map(function (moduleName, moduleIndex) {
          return CLIQZ.System.import(moduleName+"/window").then(function (Module) {
            var mod = new Module.default(windowModuleConfig);
            mod.init();
            this.windowModules[moduleIndex] = mod;
            return mod;
          }.bind(this)).catch(function (e) {
            console.log("CLIQZ core.js", "Error loading module: "+moduleName, e);
          });
        }.bind(this));

        return Promise.all(windowModulePromises).then(function () {
          var urlBarGo = document.getElementById('urlbar-go-button');
          this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
          urlBarGo.setAttribute('onclick', "CLIQZ.Core.urlbarGoClick(); " + this._urlbarGoButtonClick);

          if ('gBrowser' in window) {
              CliqzDemo.init(window);

              // CliqzEvents listeners
              this.propagateEvents("core:page_load", window.gBrowser, "load", true);
              this.propagateEvents("core:tab_select", window.gBrowser.tabContainer, "TabSelect");
          }

          CLIQZEnvironment.updateGeoLocation();

          // make sure the Qbutton popup is clean
          var menupopup = document.getElementById('cliqz-button').children.cliqz_menupopup;
          while(menupopup.lastChild) menupopup.removeChild(menupopup.lastChild);

        }.bind(this));
    },
    addCSS: function(doc, path){
        var stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = path;
        stylesheet.type = 'text/css';
        stylesheet.style.display = 'none';
        doc.documentElement.appendChild(stylesheet);

        //add this element into 'elem' to be sure we remove it at extension shutdown
        this.elem.push(stylesheet);
    },
    checkSession: function() {
        if (!CliqzUtils.hasPref('session')) {
            var source = CLIQZ.config.settings.channel;
            CliqzUtils.setPref('session', CLIQZ.Core.generateSession(source));
            return false;
        }
        // Session is set already
        return true;
    },
    generateSession: function(source){
        CliqzUtils.setSupportInfo()

        return CliqzUtils.rand(18) + CliqzUtils.rand(6, '0123456789')
               + '|' +
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    // trigger component reload at install/uninstall
    reloadUrlbar: function(el) {
        var oldVal = el.value;
        if(el && el.parentNode) {
          el.parentNode.insertBefore(el, el.nextSibling);
          el.value = oldVal;
        }
    },
    // restoring
    unload: function(soft){
        this.windowModules.slice(0).reverse().forEach(function (mod, index) {
          var moduleIndex = CLIQZ.config.modules.length - 1 - index;
          var moduleName = CLIQZ.config.modules[moduleIndex];
          try {
            mod.unload();
          } catch(e) {
            console.log("CLIQZ core.js:", "error on unload module " + moduleName, e);
          }
        });

        clearTimeout(this._whoAmItimer);

        for(var i in this.elem){
            var item = this.elem[i];
            item && item.parentNode && item.parentNode.removeChild(item);
        }

        gBrowser.tabContainer.removeEventListener("TabSelect", this.tabChange, false);
        gBrowser.tabContainer.removeEventListener("TabClose", this.tabRemoved, false);

        gBrowser.removeProgressListener(locationListener);
        gBrowser.removeTabsProgressListener(tabsProgressListener);

        CliqzRedirect.unload();


        // remove listeners
        if ('gBrowser' in window) {
            CliqzDemo.unload(window);

            this.eventListeners.forEach(function(listener) {
              listener.target.removeEventListener(listener.type, listener.func, listener.propagate);
            });
        }

        if(!soft){
            delete window.CliqzUtils;
            delete window.CliqzHistoryManager;
            delete window.CliqzAutocomplete;
            delete window.CliqzLanguage;
            delete window.CliqzDemo;
            delete window.CliqzResultProviders;
            delete window.CliqzSearchHistory;
            delete window.CliqzRedirect;
            delete window.CliqzHistoryCluster;
            delete window.CliqzHandlebars;
            delete window.CliqzEvents;
        }
    },
    restart: function(soft){
        this.unload(soft);
        this.init();
    },

    _whoAmItimer: null,
    whoAmI: function(startup){
        // schedule another signal
        this._whoAmItimer = setTimeout(function(){
            if(CLIQZ && CLIQZ.Core) CLIQZ.Core.whoAmI();
        }, this.INFO_INTERVAL);

        //executed after the services are fetched
        CliqzUtils.fetchAndStoreConfig(function(){
            // wait for search component initialization
            if(Services.search.init != null){
                Services.search.init(function(){
                    if(CLIQZ) CLIQZ.Core.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
                });
            } else {
                CLIQZ.Core.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
            }
        });
    },

    sendEnvironmentalSignal: function(startup, defaultSearchEngine){
        var screenWidth = {value: 0}, screenHeight = {value: 0};
        try {
            var screenMan = Components.classes["@mozilla.org/gfx/screenmanager;1"]
                .getService(Components.interfaces.nsIScreenManager);
            screenMan.primaryScreen.GetRect({}, {}, screenWidth, screenHeight);
        } catch(e) { }

        CliqzHistoryManager.getStats(function(history){
            // do not access content document for e10s reasons
            var browserContainer = document.getElementById('browser');
            var info = {
                type: 'environment',
                agent: navigator.userAgent,
                language: navigator.language,
                width: window.document.width,
                height: window.document.height,
                inner_height: browserContainer.clientHeight,
                inner_width: browserContainer.clientWidth,
                screen_width: screenWidth.value,
                screen_height: screenHeight.value,
                version: CliqzUtils.extensionVersion,
                history_days: history.days,
                history_urls: history.size,
                startup: startup? true: false,
                prefs: CLIQZEnvironment.getCliqzPrefs(),
                defaultSearchEngine: defaultSearchEngine,
                isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser(),
                private_window: CliqzUtils.isPrivate(window),
                distribution: CliqzUtils.getPref('distribution', ''),
                version_host: CliqzUtils.getPref('gecko.mstone', '', ''),
                version_dist: CliqzUtils.getPref('distribution.version', '', '')

            };

            CliqzUtils.telemetry(info);
        });
    },
    showUninstallMessage: function(currentVersion){
        var UNINSTALL_PREF = 'uninstallVersion',
            lastUninstallVersion = CliqzUtils.getPref(UNINSTALL_PREF, '');

        if(currentVersion && lastUninstallVersion != currentVersion){
            CliqzUtils.setPref(UNINSTALL_PREF, currentVersion);
            gBrowser.selectedTab = gBrowser.addTab(CliqzUtils.UNINSTALL);
        }
    },
    // autocomplete query inline
    autocompleteQuery: function(firstResult, firstTitle, data){
        var urlBar = this.urlbar;
        if (urlBar.selectionStart !== urlBar.selectionEnd) {
            // TODO: temp fix for flickering,
            // need to make it compatible with auto suggestion
            urlBar.mInputField.value = urlBar.mInputField.value.slice(0, urlBar.selectionStart);
        }
        if(CliqzAutocomplete._lastKey  === KeyEvent.DOM_VK_BACK_SPACE ||
           CliqzAutocomplete._lastKey  === KeyEvent.DOM_VK_DELETE){
            if (CliqzAutocomplete.selectAutocomplete) {
                CLIQZ.UI.selectAutocomplete();
            }
            CliqzAutocomplete.selectAutocomplete = false;
            return;
        }
        CliqzAutocomplete.selectAutocomplete = false;

        // History cluster does not have a url attribute, therefore firstResult is null
        var lastPattern = CliqzAutocomplete.lastPattern,
            fRes = lastPattern ? lastPattern.filteredResults() : null;
        if(!firstResult && lastPattern && fRes.length > 1)
          firstResult = fRes[0].url;

        var r, endPoint = urlBar.value.length;
        var lastPattern = CliqzAutocomplete.lastPattern;
        var results = lastPattern ? fRes : [];

        // try to update misspelings like ',' or '-'
        if (this.cleanUrlBarValue(urlBar.value).toLowerCase() != urlBar.value.toLowerCase()) {
            urlBar.mInputField.value = this.cleanUrlBarValue(urlBar.value).toLowerCase();
        }
        // Use first entry if there are no patterns
        if (results.length === 0 || lastPattern.query != urlBar.value ||
          CliqzUtils.generalizeUrl(firstResult) != CliqzUtils.generalizeUrl(results[0].url)) {
            var newResult = [];
            newResult.url = firstResult;
            newResult.title = firstTitle;
            newResult.query = [];
            results.unshift(newResult);
        }
        if (!CliqzUtils.isUrl(results[0].url)) return;

        // Detect autocomplete
        var autocomplete = CliqzHistoryCluster.autocompleteTerm(urlBar.value, results[0], true);

        // No autocomplete
        if(!autocomplete.autocomplete ||
           !CliqzUtils.getPref("browser.urlbar.autoFill", false, '') || // user has disabled autocomplete
           (autocomplete.autocomplete && JSON.stringify(data).indexOf(autocomplete.full_url) == -1)){
            CLIQZ.UI.clearAutocomplete();
            CliqzAutocomplete.lastAutocomplete = null;
            CliqzAutocomplete.lastAutocompleteType = null;
            CliqzAutocomplete.selectAutocomplete = false;
            return;
        }

        // Apply autocomplete
        CliqzAutocomplete.lastAutocompleteType = autocomplete.type;
        CliqzAutocomplete.lastAutocompleteLength = autocomplete.full_url.length;
        CliqzAutocomplete.lastAutocompleteUrlbar = autocomplete.urlbar;
        CliqzAutocomplete.lastAutocompleteSelectionStart = autocomplete.selectionStart;
        urlBar.mInputField.value = autocomplete.urlbar;
        urlBar.setSelectionRange(autocomplete.selectionStart, urlBar.mInputField.value.length);
        CliqzAutocomplete.lastAutocomplete = autocomplete.full_url;
        CLIQZ.UI.cursor = autocomplete.selectionStart;

        // Highlight first entry in dropdown
        if (autocomplete.highlight) {
            CliqzAutocomplete.selectAutocomplete = true;
            CLIQZ.UI.selectAutocomplete();
        }
    },
    cleanUrlBarValue: function(val){
        var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
            host = cleanParts[0],
            pathLength = 0,
            SYMBOLS = /,|\./g;

        if(cleanParts.length > 1){
            pathLength = ('/' + cleanParts.slice(1).join('/')).length;
        }
        if(host.indexOf('www') == 0 && host.length > 4){
            // only fix symbols in host
            if(SYMBOLS.test(host[3]) && host[4] != ' ')
                // replace only issues in the host name, not ever in the path
                return val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                       (pathLength? val.substr(-pathLength): '');
        }
        return val;
    },
    getQuerySession: function() {
        return _querySession;
    },
    refreshButtons: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext()

            try{
                var btn = win.document.getElementById('cliqz-button')
                win.CLIQZ.Core.createQbutton(btn.children.cliqz_menupopup);
            } catch(e){}
        }
    },

    createQbutton: function(menupopup){
        var win = window,
            doc = win.document,
            lang = CliqzUtils.getLanguage(win);

        //clean it
        while(menupopup.lastChild)
          menupopup.removeChild(menupopup.lastChild);

        function feedback_FAQ(){
          var feeedbackUrl = 'https://cliqz.com/' + lang + '/feedback/',
              feedbackParams =  CliqzUtils.extensionVersion + '-' + CLIQZ.config.settings.channel;

          //TODO - use the original channel instead of the current one (it will be changed at update)
          CLIQZEnvironment.openTabInWindow(win, feeedbackUrl + feedbackParams);
        }

        //feedback and FAQ
        menupopup.appendChild(this.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnFeedbackFaq'), feedback_FAQ, 'feedback'));

      // hide search prefs if the user decided to disable CLIQZ search
      if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
        menupopup.appendChild(this.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnTipsTricks'), function(){
          CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/home/cliqz-triqz');
        }, 'triqz'));
        menupopup.appendChild(doc.createElement('menuseparator'));

        menupopup.appendChild(this.createSearchOptions(doc));
        menupopup.appendChild(this.createAdultFilterOptions(doc));
        menupopup.appendChild(this.createLocationPermOptions(win));
      }

      this.windowModules.forEach(function (mod) {
        var buttonItem = mod && mod.createButtonItem && mod.createButtonItem(win);
        if (buttonItem) { menupopup.appendChild(buttonItem); }
      });

      if (CliqzUtils.getPref("cliqz_core_disabled", false)) {
        menupopup.appendChild(doc.createElement('menuseparator'));
        menupopup.appendChild(this.createActivateButton(doc));
      }
    },
    createSearchOptions: function(doc){
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup'),
            engines = CliqzResultProviders.getSearchEngines(),
            def = Services.search.currentEngine.name;

        menu.setAttribute('label', CliqzUtils.getLocalizedString('btnDefaultSearchEngine'));

        for(var i in engines){

            var engine = engines[i],
                item = doc.createElement('menuitem');
            item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
            item.setAttribute('class', 'menuitem-iconic');
            item.engineName = engine.name;
            if(engine.name == def){
                item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
            }
            // TODO: Where is this listener removed?
            item.addEventListener('command', (function(event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
                CliqzUtils.telemetry({
                  type: 'activity',
                  action: 'cliqz_menu_button',
                  button_name: 'search_engine_change_' + event.currentTarget.engineName
                });
            }).bind(this), false);

            menupopup.appendChild(item);
        }

        menu.appendChild(menupopup);

        return menu;
    },
    createAdultFilterOptions: function(doc) {
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup');

        menu.setAttribute('label', CliqzUtils.getLocalizedString('result_filter'));

        var filter_levels = CliqzUtils.getAdultFilterState();

        for(var level in filter_levels) {
          var item = doc.createElement('menuitem');
          item.setAttribute('label', filter_levels[level].name);
          item.setAttribute('class', 'menuitem-iconic');

          if(filter_levels[level].selected){
            item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
          }

          item.filter_level = new String(level);
          item.addEventListener('command', function(event) {
            CliqzUtils.setPref('adultContentFilter', this.filter_level.toString());
            CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
            CliqzUtils.telemetry({
              type: 'activity',
              action: 'cliqz_menu_button',
              button_name: 'adult_filter_change_' + this.filter_level
            });
          }, false);

          menupopup.appendChild(item);
        };
        menu.appendChild(menupopup);
        return menu;
    },

    createLocationPermOptions: function(win) {
      var doc = win.document,
          menu = doc.createElement('menu'),
          menupopup = doc.createElement('menupopup');

      menu.setAttribute('label', CliqzUtils.getLocalizedString('share_location'));

      var filter_levels = this.getLocationPermState();

      for(var level in filter_levels) {
        var item = doc.createElement('menuitem');
        item.setAttribute('label', filter_levels[level].name);
        item.setAttribute('class', 'menuitem-iconic');


        if(filter_levels[level].selected){
          item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';

        }

        item.filter_level = new String(level);
        item.addEventListener('command', function(event) {
            CLIQZEnvironment.setLocationPermission(window, this.filter_level.toString());
            CliqzUtils.telemetry({
              type: 'activity',
              action: 'cliqz_menu_button',
              button_name: 'location_change_' + this.filter_level
            });
        }, false);

        menupopup.appendChild(item);
      };

      var learnMore = this.createSimpleBtn(
          doc,
          CliqzUtils.getLocalizedString('learnMore'),
          function(){
            var lang = CliqzUtils.getLanguage(win) == 'de' ? '' : 'en/';
            CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/' + lang + 'privacy');
          },
          'location_learn_more'
      );
      learnMore.setAttribute('class', 'menuitem-iconic');
      menupopup.appendChild(doc.createElement('menuseparator'));
      menupopup.appendChild(learnMore);

      menu.appendChild(menupopup);
      return menu;
    },

    createSimpleBtn: function(doc, txt, func, action){
        var item = doc.createElement('menuitem');
        item.setAttribute('label', txt);
        item.setAttribute('action', action);
        if(func)
            item.addEventListener(
                'command',
                function() {
                    CliqzUtils.telemetry({
                        type: 'activity',
                        action: 'cliqz_menu_button',
                        button_name: action
                    });
                    func();
                },
                false);
        else
            item.setAttribute('disabled', 'true');

        return item
    },
    createCheckBoxItem: function(doc, key, label, activeState, onChange){
        function optInOut(){
            return CliqzUtils.getPref(key, false) == (activeState == 'undefined' ? true : activeState)?
               'url(' + CLIQZEnvironment.SKIN_PATH + 'opt-in.svg)':
               'url(' + CLIQZEnvironment.SKIN_PATH + 'opt-out.svg)';
        }

        var btn = doc.createElement('menuitem');
        btn.setAttribute('label', label || key);
        btn.setAttribute('class', 'menuitem-iconic');
        btn.style.listStyleImage = optInOut();
        btn.addEventListener('command', function(event) {
            if(onChange){
                onChange();
            } else {
                CliqzUtils.setPref(key, !CliqzUtils.getPref(key, false));
            }
            CliqzUtils.telemetry({
                type: 'activity',
                action: 'cliqz_menu_button',
                button_name: key
            });

            btn.style.listStyleImage = optInOut();
        }, false);

        return btn;
    },
    createActivateButton: function(doc) {
      var button = doc.createElement('menuitem');
      button.setAttribute('label', CliqzUtils.getLocalizedString('btnActivateCliqz'));
      button.addEventListener('command', (function(event) {
        CliqzUtils.setPref("cliqz_core_disabled", false);

        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            win.CLIQZ.Core.init();
        }

        CliqzUtils.telemetry({
          type: 'setting',
          setting: 'international',
          value: 'activate'
        });
      }).bind(this));
      return button;
    },
    getLocationPermState: function(){
        var data = {
          'yes': {
                  name: CliqzUtils.getLocalizedString('always'),
                  selected: false
          },
          'ask': {
                  name: CliqzUtils.getLocalizedString('always_ask'),
                  selected: false
          },
          'no': {
              name: CliqzUtils.getLocalizedString('never'),
              selected: false
          }
        };

        data[CliqzUtils.getPref('share_location', 'ask')].selected = true;

        return data;
    },
    /** Adds a listener to eventTarget for events of type eventType, and republishes them
     *  through CliqzEvents with id eventPubName.
     *  Listeners registered through this function are automatically unsubscribed when core.js
     *  is unloaded.
     */
    propagateEvents: function(eventPubName, eventTarget, eventType, propagate) {
      var publishEvent = function() {
        // call CliqzEvents.pub with arguments [eventPubName, ...arguments].
        // this causes clients listening to eventPubName get mirrored arguments from the original event
        CliqzEvents.pub.bind(CliqzEvents, eventPubName).apply(CliqzEvents, arguments);
      };

      CliqzUtils.log("Propagating "+ eventType +" events to CliqzEvents as "+ eventPubName, "CliqzEvents");
      this.eventListeners.push({ target: eventTarget, type: eventType, func: publishEvent, propagate: propagate || false });
      eventTarget.addEventListener(eventType, publishEvent, propagate || false);
    }
};
