'use strict';
var EXPORTED_SYMBOLS = ['CLIQZEnvironment'];
const {
  classes:    Cc,
  interfaces: Ci,
  utils:      Cu,
  manager:    Cm
} = Components;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/NewTabUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzWikipediaDeduplication',
    'chrome://cliqzmodules/content/CliqzWikipediaDeduplication.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

var _log = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService),
    // references to all the timers to avoid garbage collection before firing
    // automatically removed when fired
    _timers = [],
    _setTimer = function(func, timeout, type, args) {
        var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
        _timers.push(timer);

        var event = {
            notify: function (timer) {
                func.apply(null, args);

                // remove the reference of the setTimeout instances
                // be sure the setInterval instances do not get canceled and removed
                // loosing all the references of a setInterval allows the garbage
                // collector to stop the interval
                if(Ci && type == Ci.nsITimer.TYPE_ONE_SHOT){
                  _removeTimerRef && _removeTimerRef(timer);
                }
            }
        };
        timer.initWithCallback(event, timeout, type);
        return timer;
    },
    _removeTimerRef = function(timer){
        timer.cancel();

        var i = _timers.indexOf(timer);
        if (i >= 0) {
            _timers.splice(_timers.indexOf(timer), 1);
        }
    },
    FFcontract = {
        classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
        classDescription : 'Cliqz',
        contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
        QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ])
    };

var CLIQZEnvironment = {
    LOCALE_PATH: 'chrome://cliqz/content/static/locale/',
    TEMPLATES_PATH: 'chrome://cliqz/content/static/templates/',
    SKIN_PATH: 'chrome://cliqz/content/static/skin/',
    SYSTEM_BASE_URL: 'chrome://cliqz/content/',
    MIN_QUERY_LENGHT_FOR_EZ: 2,
    prefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch(''),
    OS: Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS.toLowerCase(),
    LAST_SLEEP: 0,
    LAST_GEOLOCATION_UPDATE: 0,
    GEOLOCATION_UPDATE_MIN_WAIT: 3600 * 1000, // If the computer wakes up from a sleep that was longer than this many milliseconds, we update geolocation.
    LOCATION_ACCURACY: 3, // Number of decimal digits to keep in user's location
    RERANKERS: [CliqzWikipediaDeduplication],
    SHARE_LOCATION_ONCE: false,
    OBSERVERS: [
      {
        notifications: ['wake_notification', 'sleep_notification'],
        observer: {
          observe: function(subject, topic, data) {
            var currentTimestamp = new Date().getTime();
            if (topic == 'sleep_notification') {
              CLIQZEnvironment.LAST_SLEEP = currentTimestamp;
            } else if (topic == 'wake_notification') {
              // Just in case we fail to handle the sleep_notification, we still
              // need to make sure geolocation is never updated more often than
              // once every GEOLOCATION_UPDATE_MIN_WAIT milliseconds.
              var lastTimestamp = Math.max(CLIQZEnvironment.LAST_SLEEP, CLIQZEnvironment.LAST_GEOLOCATION_UPDATE);
              if (currentTimestamp - lastTimestamp >= CLIQZEnvironment.GEOLOCATION_UPDATE_MIN_WAIT) {
                CLIQZEnvironment.updateGeoLocation();
              }
            }
          }
        }
      }
    ],
    TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
      'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
      'spellcheck': 1,
      'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
      'entity-portal': 3, 'topsites': 3,
      'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'stocks': 2, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
      'entity-search-1': 2, 'flightStatusEZ-2': 2, 'weatherEZ': 2, 'commicEZ': 3,
      'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
      'ligaEZ1Game': 2,
      'ligaEZUpcomingGames': 3,
      'ligaEZTable': 3,
      'local-movie-sc':3,
      'local-cinema-sc':3,
      'local-data-sc': 2,
      'recipe': 3,
      'rd-h3-w-rating': 1,
      'ez-generic-2': 3,
      'cpgame_movie': 3,
      'delivery-tracking': 2,
      'vod': 3,
      'conversations': 1,
      'conversations_future': 1,
      'topnews': 1,
      '_generic': 1,
      '_history': 1
    },
    MESSAGE_TEMPLATES: [
      'footer-message',
      'onboarding-callout',
      'onboarding-callout-extended',
      'slow_connection',
      'partials/location/missing_location_2',
      'partials/location/no-locale-data'
    ],
    PARTIALS: [
        'url',
        'logo',
        'EZ-category',
        'partials/ez-title',
        'partials/ez-url',
        'partials/ez-history',
        'partials/ez-description',
        'partials/ez-generic-buttons',
        'EZ-history',
        'rd-h3-w-rating',
        'pcgame_movie_side_snippet',
        'partials/location/local-data',
        'partials/location/missing_location_1',
        'partials/timetable-cinema',
        'partials/timetable-movie',
        'partials/music-data-sc',
        'partials/streaming',
        'partials/lyrics'
    ],
    init: function(){
        CLIQZEnvironment.loadSearch();
        CLIQZEnvironment.registerObservers();
    },
    unload: function() {
        CLIQZEnvironment.unloadSearch();
        _timers.forEach(_removeTimerRef);
        CLIQZEnvironment.unregisterObservers();
    },
    registerObservers: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
      CLIQZEnvironment.OBSERVERS.forEach(function(el) {
        el.notifications.forEach(function(notification) {
          observerService.addObserver(el.observer, notification, false);
        });
      });
    },
    unregisterObservers: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
      CLIQZEnvironment.OBSERVERS.forEach(function(el) {
        el.notifications.forEach(function(notification) {
          observerService.removeObserver(el.observer, notification);
        });
      });
    },
    log: function(msg, key){
        _log.logStringMessage(
          'CLIQZ ' + (new Date()).toISOString() + (key? ' ' + key : '') + ': ' +
          (typeof msg == 'object'? JSON.stringify(msg): msg)
        );
    },
    __prefixPref: function (pref, prefix) {
        if ( !(typeof prefix === 'string') ) {
          prefix = 'extensions.cliqz.';
        }
        return prefix + pref;
    },
    getPref: function(pref, defaultValue, prefix) {
        pref = CLIQZEnvironment.__prefixPref(pref, prefix);

        var prefs = CLIQZEnvironment.prefs;

        try {
            switch(prefs.getPrefType(pref)) {
                case 128: return prefs.getBoolPref(pref);
                case 32:  return prefs.getCharPref(pref);
                case 64:  return prefs.getIntPref(pref);
                default:  return defaultValue;
            }
        } catch(e) {
            return defaultValue;
        }
    },
    setPref: function(pref, value, prefix){
        pref = CLIQZEnvironment.__prefixPref(pref, prefix);

        var prefs = CLIQZEnvironment.prefs;

        switch (typeof value) {
            case 'boolean': prefs.setBoolPref(pref, value); break;
            case 'number':  prefs.setIntPref(pref, value); break;
            case 'string':  prefs.setCharPref(pref, value); break;
        }
    },
    hasPref: function (pref, prefix) {
        pref = CLIQZEnvironment.__prefixPref(pref, prefix);

        return CLIQZEnvironment.prefs.getPrefType(pref) !== 0;
    },
    clearPref: function (pref, prefix) {
        pref = CLIQZEnvironment.__prefixPref(pref, prefix);

        CLIQZEnvironment.prefs.clearUserPref(pref);
    },
    getCliqzPrefs: function(){
        return Cc['@mozilla.org/preferences-service;1']
                 .getService(Ci.nsIPrefService)
                 .getBranch('extensions.cliqz.')
                 .getChildList('')
                 .reduce(function (prev, curr) {
                    // dont send any :
                    //    - backup data like startpage to avoid privacy leaks
                    //    - deep keys like "attrack.update" which are not needed
                    if(curr.indexOf('backup') == -1 && curr.indexOf('.') == -1 )
                      prev[curr] = CliqzUtils.getPref(curr);
                    return prev;
                 }, {});
    },
    isUnknownTemplate: function(template){
      return template &&
        CLIQZEnvironment.TEMPLATES.hasOwnProperty(template) == false;
    },
    isDefaultBrowser: function(){
      try {
        var shell = Components.classes["@mozilla.org/browser/shell-service;1"]
                      .getService(Components.interfaces.nsIShellService)
        if (shell) {
          return shell.isDefaultBrowser(false);
        }
      } catch(e) {}

      return null;
    },
    httpHandler: function(method, url, callback, onerror, timeout, data, sync, encoding){
        var req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        req.timestamp = + new Date();
        req.open(method, url, !sync);
        req.overrideMimeType('application/json');

        // headers for compressed data
        if ( encoding ) {
            req.setRequestHeader('Content-Encoding', encoding);
        }

        req.onload = function(){
            if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
                callback && callback(req);
            } else {
                CliqzUtils.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CLIQZEnvironment){
                CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CLIQZEnvironment){ //might happen after disabling the extension
                CliqzUtils.log( "timeout for " + url, "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }

        if(callback){
            if(timeout){
                req.timeout = parseInt(timeout)
            } else {
                req.timeout = (method == 'POST'? 10000 : 1000);
            }
        }

        req.send(data);
        return req;
    },
    getLocalStorage: function(url) {
      var uri = Services.io.newURI(url,"",null),
          principalFunction = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(Components.interfaces.nsIScriptSecurityManager).getNoAppCodebasePrincipal

      if (typeof principalFunction != "function") return false

      var principal = principalFunction(uri),
          dsm = Components.classes["@mozilla.org/dom/localStorage-manager;1"]
                .getService(Components.interfaces.nsIDOMStorageManager)

      return dsm.getLocalStorageForPrincipal(principal, '')
    },
    promiseHttpHandler: function(method, url, data, timeout, compressedPost) {
        //lazy load gzip module
        if(compressedPost && !CLIQZEnvironment.gzip){
            CliqzUtils.importModule('core/gzip').then( function(gzip) {
               CLIQZEnvironment.gzip = gzip
            });
        }

        return new Promise( function(resolve, reject) {
            // gzip.compress may be false if there is no implementation for this platform
            // or maybe it is not loaded yet
            if ( CLIQZEnvironment.gzip && CLIQZEnvironment.gzip.compress && method === 'POST' && compressedPost) {
                var dataLength = data.length;
                data = CLIQZEnvironment.gzip.compress(data);
                CliqzUtils.log("Compressed request to "+ url +", bytes saved = "+ (dataLength - data.length) + " (" + (100*(dataLength - data.length)/ dataLength).toFixed(1) +"%)", "CLIQZEnvironment.httpHandler");
                CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data, undefined, 'gzip');
            } else {
                CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data);
            }
        });
    },
    openLink: function(win, url, newTab, newWindow, newPrivateWindow){
        // make sure there is a protocol (this is required
        // for storing it properly in Firefoxe's history DB)
        if(url.indexOf("://") == -1 && url.trim().indexOf('about:') != 0)
            url = "http://" + url;

        // Firefox history boosts URLs that are typed in the URL bar, autocompleted,
        // or selected from the history dropbdown; thus, mark page the user is
        // going to see as "typed" (i.e, the value Firefox would assign to such URLs)
        try {
            var historyService =
                Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            var ioService =
                Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var urlObject = ioService.newURI(url, null, null);
                historyService.markPageAsTyped(urlObject);
        } catch(e) { }

        win.CLIQZ.Core.triggerLastQ = true;
        if(newTab) {
           return win.gBrowser.addTab(url);
        } else if(newWindow) {
            win.open(url, '_blank');
        } else if(newPrivateWindow) {
            win.openLinkIn(url, "window", { private: true });
        }
        else {
            //clean selected text to have a valid last Query
            //if(CliqzAutocomplete.lastSearch != CLIQZ.Core.urlbar.value)
            //    CLIQZ.Core.urlbar.value = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);

            // Set urlbar value to url immediately
            win.CLIQZ.Core.urlbar.value = url;
            win.openUILink(url);
        }
    },
    copyResult: function(val) {
        var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
        gClipboardHelper.copyString(val);
    },
    tldExtractor: function(host){
        var eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"]
                            .getService(Ci.nsIEffectiveTLDService),
            idnService = Cc["@mozilla.org/network/idn-service;1"]
                            .getService(Ci.nsIIDNService),
            utf8str = idnService.convertACEtoUTF8(encodeURIComponent(host));

        return decodeURIComponent(eTLDService.getPublicSuffixFromHost(utf8str));
    },
    getBrandsDBUrl: function(version){
      return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json'
    },
    isPrivate: function(win) {
        if(typeof win == "undefined") win = CLIQZEnvironment.getWindow();

        if(win && win.cliqzIsPrivate === undefined){
            try {
                // Firefox 20+
                Cu.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
                win.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(win);
            } catch(e) {
                // pre Firefox 20
                try {
                  win.cliqzIsPrivate = Cc['@mozilla.org/privatebrowsing;1'].
                                          getService(Ci.nsIPrivateBrowsingService).
                                          privateBrowsingEnabled;
                } catch(ex) {
                  Cu.reportError(ex);
                  win.cliqzIsPrivate = true;
                }
            }
        }

        return win.cliqzIsPrivate
    },
    setInterval: function(func, timeout) {
        return _setTimer(func, timeout, Ci.nsITimer.TYPE_REPEATING_PRECISE, [].slice.call(arguments, 2));
    },
    setTimeout: function(func, timeout) {
        return _setTimer(func, timeout, Ci.nsITimer.TYPE_ONE_SHOT, [].slice.call(arguments, 2));
    },
    clearTimeout: function(timer) {
        if (!timer) {
            return;
        }
        _removeTimerRef(timer);
    },
    clearInterval: this.clearTimeout,
    getWindow: function(){
        var wm = Cc['@mozilla.org/appshell/window-mediator;1']
                            .getService(Ci.nsIWindowMediator);
        return wm.getMostRecentWindow("navigator:browser");
    },
    getWindowID: function(){
        var win = CLIQZEnvironment.getWindow();
        var util = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
        return util.outerWindowID;
    },
    openTabInWindow: function(win, url, relatedToCurrent = false){
        var tBrowser = win.document.getElementById('content');
        var tab = tBrowser.addTab(url, {relatedToCurrent: relatedToCurrent});
        tBrowser.selectedTab = tab;
    },
    // TODO: move this
    trk: [],
    telemetry: (function(url){
      var trkTimer = null,
          telemetrySeq = -1,
          telemetryReq = null,
          telemetrySending = [],
          telemetryStart = undefined,
          TELEMETRY_MAX_SIZE = 500;

      function getNextSeq(){
        if(telemetrySeq == -1)
          telemetrySeq = CliqzUtils.getPref('telemetrySeq', 0)

        telemetrySeq = (telemetrySeq + 1) % 2147483647;

        return telemetrySeq;
      }

      function pushTelemetry() {
        CliqzUtils.setPref('telemetrySeq', telemetrySeq);
        if(telemetryReq) return;

        // put current data aside in case of failure
        telemetrySending = CLIQZEnvironment.trk.slice(0);
        CLIQZEnvironment.trk = [];

        telemetryStart = Date.now();

        CliqzUtils.log('push telemetry data: ' + telemetrySending.length + ' elements', "pushTelemetry");

        telemetryReq = CliqzUtils.promiseHttpHandler('POST', CliqzUtils.LOG, JSON.stringify(telemetrySending), 10000, true);
        telemetryReq.then( pushTelemetryCallback );
        telemetryReq.catch( pushTelemetryError );
      }

      function pushTelemetryCallback(req){
        try {
          var response = JSON.parse(req.response);

          if(response.new_session){
            CliqzUtils.setPref('session', response.new_session);
          }
          telemetrySending = [];
          telemetryReq = null;
        } catch(e){}
      }

      function pushTelemetryError(req){
        // pushTelemetry failed, put data back in queue to be sent again later
        CliqzUtils.log('push telemetry failed: ' + telemetrySending.length + ' elements', "pushTelemetry");
        CLIQZEnvironment.trk = telemetrySending.concat(CLIQZEnvironment.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CLIQZEnvironment.trk.length - TELEMETRY_MAX_SIZE + 100;
        if(slice_pos > 0){
          CliqzUtils.log('discarding ' + slice_pos + ' old telemetry data', "pushTelemetry");
          CLIQZEnvironment.trk = CLIQZEnvironment.trk.slice(slice_pos);
        }

        telemetrySending = [];
        telemetryReq = null;
      }

      return function(msg, instantPush) {
        if(!CliqzUtils) return; //might be called after the module gets unloaded
        if(msg.type != 'environment' && CliqzUtils.isPrivate()) return; // no telemetry in private windows

        CliqzUtils.log(msg, 'Utils.telemetry');
        if(!CliqzUtils.getPref('telemetry', true))return;
        msg.session = CLIQZEnvironment.getPref('session');
        msg.ts = Date.now();
        msg.seq = getNextSeq();

        CLIQZEnvironment.trk.push(msg);
        CliqzUtils.clearTimeout(trkTimer);
        if(instantPush || CLIQZEnvironment.trk.length % 100 == 0){
          pushTelemetry();
        } else {
          trkTimer = CliqzUtils.setTimeout(pushTelemetry, 60000);
        }
      }
    })(),

    // from CliqzAutocomplete
    loadSearch: function(){
        var reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(FFcontract.contractID),
                reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
            )
        }catch(e){}

        //extend prototype
        for(var k in FFcontract) CliqzAutocomplete.CliqzResults.prototype[k] = FFcontract[k];

        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

    },
    unloadSearch: function(){
        var reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(FFcontract.contractID),
            reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
          );
        }catch(e){}
    },
    //TODO: cache this
    getSearchEngines: function(){
        var defEngineName = Services.search.defaultEngine.name;

        return Services.search.getEngines()
                .filter(function(e){
                    return !e.hidden && e.iconURI != null;
                })
                .map(function(e){
                    var r = {
                        name: e.name,
                        alias: e.alias,
                        default: e.name == defEngineName,
                        icon: e.iconURI.spec,
                        base_url: e.searchForm,
                        getSubmissionForQuery: function(q){
                            //TODO: create the correct search URL
                            return e.getSubmission(q).uri.spec;
                        }
                    }
                    return r;
                });
    },
    updateAlias: function(name, newAlias) {
      Services.search.getEngineByName(name).alias = newAlias;
    },
    getEngineByAlias: function(alias) {
     return Services.search.getEngineByAlias(alias);
    },
    getEngineByName: function(engine) {
      return Services.search.getEngineByName(engine);
    },
    addEngineWithDetails: function(engine) {
      Services.search.addEngineWithDetails(
        engine.name,
        engine.iconURL,
        engine.key,
        engine.name,
        engine.method,
        engine.url
      );
    },
    initWindow: function(win){
        var popup = win.CLIQZ.Core.popup;
        //patch this method to avoid any caching FF might do for components.xml
        popup._appendCurrentResult = function(){
            if(popup._matchCount > 0 && popup.mInput){
              //try to break the call stack which cause 'too much recursion' exception on linux systems
              CLIQZEnvironment.setTimeout(function(win){ win.CLIQZ.UI.handleResults.apply(win); }, 0, win);
            }
        };

        popup._openAutocompletePopup = function(){
            (function(aInput, aElement){
              var lr = CliqzAutocomplete.lastResult;
              if(lr && lr.searchString != aInput.value && aInput.value == '') {
                return;
              }
              if (!CliqzAutocomplete.isPopupOpen){
                this.mInput = aInput;
                this._invalidate();

                var width = aElement.getBoundingClientRect().width;
                this.setAttribute("width", width > 500 ? width : 500);
                // 0,0 are the distance from the topleft of the popup to aElement (the urlbar). If these values change, please adjust how mouse position is calculated for click event (in telemetry signal)
                this.openPopup(aElement, "after_start", 0, 0 , false, true);
              }
            }).apply(popup, arguments)
        };
    },
    getGeo: function(allowOnce, callback, failCB) {
        /*
        @param allowOnce:           If true, the location will be returned this one time without checking if share_location == "yes"
                                    This is used when the user clicks on Share Location "Just once".
        */
        if (!(allowOnce || CliqzUtils.getPref("share_location") == "yes")) {
          failCB("No permission to get user's location");
          return;
        }

        if (CLIQZEnvironment.USER_LAT && CLIQZEnvironment.USER_LNG) {
          callback({
            lat: CLIQZEnvironment.USER_LAT,
            lng: CLIQZEnvironment.USER_LNG
          });
        } else {
          var geoService = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);
          geoService.getCurrentPosition(function (p) {
            callback({
              lat: CliqzUtils.roundToDecimal(p.coords.latitude, CLIQZEnvironment.LOCATION_ACCURACY),
              lng: CliqzUtils.roundToDecimal(p.coords.longitude, CLIQZEnvironment.LOCATION_ACCURACY)
            });
          }, failCB);
        }
    },
    updateGeoLocation: function() {
      var geoService = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);

      if (CLIQZEnvironment.getPref('share_location') == 'yes' || CLIQZEnvironment.SHARE_LOCATION_ONCE) {
        // Get current position
        geoService.getCurrentPosition(function(p) {
          // the callback might come late if the extension gets disabled very fast
          if(!CliqzUtils) return;

          CLIQZEnvironment.USER_LAT = CliqzUtils.roundToDecimal(p.coords.latitude, CLIQZEnvironment.LOCATION_ACCURACY);
          CLIQZEnvironment.USER_LNG =  CliqzUtils.roundToDecimal(p.coords.longitude, CLIQZEnvironment.LOCATION_ACCURACY);
          CLIQZEnvironment.LAST_GEOLOCATION_UPDATE = new Date().getTime();
        },
        function(e) {
          CliqzUtils.log(e, "Error updating geolocation");
        });
      } else {
        CLIQZEnvironment.USER_LAT = null;
        CLIQZEnvironment.USER_LNG = null;
      }
    },
    setLocationPermission: function(window, newPerm) {
      if (newPerm == "yes" || newPerm == "no" || newPerm == "ask") {
        CLIQZEnvironment.setPref('share_location',newPerm);
        CLIQZEnvironment.setTimeout(window.CLIQZ.Core.refreshButtons, 0);
        CLIQZEnvironment.updateGeoLocation();
      }
    },
    // from ContextMenu
    openPopup: function(contextMenu, ev, x, y) {
      contextMenu.openPopupAtScreen(x, y, false);
    },
    createContextMenu: function(box, menuItems) {
      var doc = CliqzUtils.getWindow().document,
          contextMenu = doc.createElement('menupopup');
      box.appendChild(contextMenu);
      contextMenu.setAttribute('id', "dropdownContextMenu");

      for(var item = 0; item < menuItems.length; item++) {
          var menuItem = doc.createElement('menuitem');
          menuItem.setAttribute('label', menuItems[item].label);
          menuItem.setAttribute('functionality', menuItems[item].functionality);
          menuItem.addEventListener("command", menuItems[item].command, false);
          if(menuItem.getAttribute('label') === CliqzUtils.getLocalizedString('cMenuFeedback')) {
            menuItem.setAttribute('class', 'menuitem-iconic');
            menuItem.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'cliqz.png)';
          }
          contextMenu.appendChild(menuItem);
      }
      return contextMenu
    },
    /**
     * Construct a uri from a url
     * @param {string}  aUrl - url
     * @param {string}  aOriginCharset - optional character set for the URI
     * @param {nsIURI}  aBaseURI - base URI for the spec
     */
    makeUri: function(aUrl, aOriginCharset, aBaseURI) {
      var uri;
      try {
        uri = Services.io.newURI(aUrl, aOriginCharset, aBaseURI);
      } catch(e) {
        uri = null
      }
      return uri;
    },
    // lazy init
    // callback called multiple times
    historySearch: (function(){
        var hist = {};

        XPCOMUtils.defineLazyServiceGetter(
            hist,
            'search',
            '@mozilla.org/autocomplete/search;1?name=history',
            'nsIAutoCompleteSearch');

        return function(q, callback, sessionStart){
            // special case: user has deleted text from urlbar
            if(q.length != 0 && urlbar().value.length == 0)
              return;

            if(q.length == 0 && sessionStart){
                NewTabUtils.links.populateCache(function(){
                    callback(null, getTopSites());
                })
            }
            else {
                hist.search.startSearch(q, 'enable-actions', null, {
                    onSearchResult: function(ctx, result) {
                        var res = [];
                        for (var i = 0; result && i < result.matchCount; i++) {
                            res.push({
                                style:   result.getStyleAt(i),
                                value:   result.getValueAt(i),
                                image:   result.getImageAt(i),
                                comment: result.getCommentAt(i),
                                label:   result.getLabelAt(i)
                            });
                        }
                        callback({
                            query: q,
                            results: res,
                            ready:  result.searchResult != result.RESULT_NOMATCH_ONGOING &&
                                    result.searchResult != result.RESULT_SUCCESS_ONGOING
                        })
                    }
                });
            }
        }
    })(),
    getNoResults: function() {
      var se = [// default
              {"name": "DuckDuckGo", "base_url": "https://duckduckgo.com"},
              {"name": "Bing", "base_url": "https://www.bing.com/search?q=&pc=MOZI"},
              {"name": "Google", "base_url": "https://www.google.de"},
              {"name": "Google Images", "base_url": "https://images.google.de/"},
              {"name": "Google Maps", "base_url": "https://maps.google.de/"}
          ],
          chosen = new Array();

      var engines = CliqzResultProviders.getSearchEngines(),
          defaultName = engines[0].name;

      se.forEach(function(def){
        engines.forEach(function(e){
          if(def.name == e.name){
              var url = def.base_url || e.base_url;

              def.code = e.code;
              def.style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url)).style;
              def.text = e.prefix.slice(1);

              chosen.push(def)
          }
          if(e.default) defaultName = e.name;
        })
      })



      return Result.cliqzExtra(
              {
                  data:
                  {
                      template:'noResult',
                      text_line1: CliqzUtils.getLocalizedString('noResultTitle'),
                      // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
                      // we should take care of this specific case differently on alternative platforms
                      text_line2: CliqzUtils.getLocalizedString('noResultMessage', defaultName),
                      "search_engines": chosen,
                      //use local image in case of no internet connection
                      "cliqz_logo": CLIQZEnvironment.SKIN_PATH + "img/cliqz.svg"
                  },
                  subType: JSON.stringify({empty:true})
              }
          )
    }
}
function urlbar(){
  return CliqzUtils.getWindow().CLIQZ.Core.urlbar;
}

function getTopSites(){
    var results = NewTabUtils.links.getLinks().slice(0, 5);
    if(results.length>0){
        var top = Result.generic('cliqz-extra', '', null, '', null, '', null, JSON.stringify({topsites:true}));
        top.data.title = CliqzUtils.getLocalizedString('topSitesTitle');
        top.data.message = CliqzUtils.getLocalizedString('topSitesMessage');
        top.data.message1 = CliqzUtils.getLocalizedString('topSitesMessage1');
        top.data.cliqz_logo = CLIQZEnvironment.SKIN_PATH + 'img/cliqz.svg';
        top.data.lastQ = CliqzUtils.getWindow().gBrowser.selectedTab.cliqz;
        top.data.url = results[0].url;
        top.data.template = 'topsites';
        top.data.urls = results.map(function(r, i){
            var urlDetails = CliqzUtils.getDetailsFromUrl(r.url),
                logoDetails = CliqzUtils.getLogoDetails(urlDetails);

            return {
              url: r.url,
              href: r.url.replace(urlDetails.path, ''),
              link: r.url.replace(urlDetails.path, ''),
              name: urlDetails.name,
              text: logoDetails.text,
              style: logoDetails.style,
              extra: "top-sites-" + i
            }
        });
        return top
    }
}
