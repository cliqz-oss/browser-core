const {
  classes:    Cc,
  interfaces: Ci,
  utils:      Cu,
  manager:    Cm
} = Components;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/NewTabUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzPlacesAutoComplete.jsm');

var _log = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);

var CLIQZEnvironment = {
    LOG: 'https://logging.cliqz.com',
    LOCALE_PATH: 'chrome://cliqz/content/static/locale/',
    TEMPLATES_PATH: 'chrome://cliqz/content/static/templates/',
    SKIN_PATH: 'chrome://cliqz/content/static/skin/',
    SYSTEM_BASE_URL: 'chrome://cliqz/content/',
    MIN_QUERY_LENGHT_FOR_EZ: 2,
    prefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch(''),
    OS: Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS.toLowerCase(),
    RERANKERS: [],
    TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
      'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
      'spellcheck': 1,
      'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
      'pattern-hm': 1,
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
      '_history': 1,
      'liveTicker': 3
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

    },
    unload: function() {
    },
    log: function(msg, key){
      if(CLIQZEnvironment && CLIQZEnvironment.getPref('showConsoleLogs', false)){
        _log.logStringMessage(
          'CLIQZ ' + (new Date()).toISOString() + (key? ' ' + key : '') + ': ' +
          (typeof msg == 'object'? JSON.stringify(msg): msg)
        );
      }
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
                case 32:  {
                  var charVal = prefs.getCharPref(pref);

                  // it might be a complex value
                  if(charVal === "chrome://global/locale/intl.properties"){
                    try {
                      charVal = prefs.getComplexValue(pref, Components.interfaces.nsIPrefLocalizedString).data;
                    } catch (e) {
                      CLIQZEnvironment.log("Error fetching pref: "  + pref);
                    }
                  }

                  return charVal;
                }
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
                      prev[curr] = CLIQZEnvironment.getPref(curr);
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
        req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
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
                CLIQZEnvironment.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CLIQZEnvironment){
                CLIQZEnvironment.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CLIQZEnvironment){ //might happen after disabling the extension
                CLIQZEnvironment.log( "timeout for " + url, "CLIQZEnvironment.httpHandler");
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
      return new Promise( function(resolve, reject) {
       // gzip.compress may be false if there is no implementation for this platform
       // or maybe it is not loaded yet
       if (CLIQZEnvironment.gzip && CLIQZEnvironment.gzip.compress && method === 'POST' && compressedPost) {
         const dataLength = data.length;
         data = CLIQZEnvironment.gzip.compress(data);
         CLIQZEnvironment.log("Compressed request to "+ url +", bytes saved = "+ (dataLength - data.length) + " (" + (100*(dataLength - data.length)/ dataLength).toFixed(1) +"%)", "CLIQZEnvironment.httpHandler");
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
        // try to get the current active window
        if(!win) win = CLIQZEnvironment.getWindow();

        // return false if we still do not have a window
        if(!win) return false;

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

    /**
     * @param {ChromeWindow} win - browser window to check.
     * @return whether |win|'s current tab is in private mode.
     */
    isOnPrivateTab: function(win) {
      return win.gBrowser.selectedBrowser.loadContext.usePrivateBrowsing;
    },

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
          telemetrySeq = CLIQZEnvironment.getPref('telemetrySeq', 0)

        telemetrySeq = (telemetrySeq + 1) % 2147483647;

        return telemetrySeq;
      }

      function pushTelemetry() {
        CLIQZEnvironment.setPref('telemetrySeq', telemetrySeq);
        if(telemetryReq) return;

        // put current data aside in case of failure
        telemetrySending = CLIQZEnvironment.trk.slice(0);
        CLIQZEnvironment.trk = [];

        telemetryStart = Date.now();

        CLIQZEnvironment.log('push telemetry data: ' + telemetrySending.length + ' elements', "pushTelemetry");

        telemetryReq = CLIQZEnvironment.promiseHttpHandler('POST', CLIQZEnvironment.LOG, JSON.stringify(telemetrySending), 10000, true);
        telemetryReq.then( pushTelemetryCallback );
        telemetryReq.catch( pushTelemetryError );
      }

      function pushTelemetryCallback(req){
        try {
          var response = JSON.parse(req.response);

          if(response.new_session){
            CLIQZEnvironment.setPref('session', response.new_session);
          }
          telemetrySending = [];
          telemetryReq = null;
        } catch(e){}
      }

      function pushTelemetryError(req){
        // pushTelemetry failed, put data back in queue to be sent again later
        CLIQZEnvironment.log('push telemetry failed: ' + telemetrySending.length + ' elements', "pushTelemetry");
        CLIQZEnvironment.trk = telemetrySending.concat(CLIQZEnvironment.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CLIQZEnvironment.trk.length - TELEMETRY_MAX_SIZE + 100;
        if(slice_pos > 0){
          CLIQZEnvironment.log('discarding ' + slice_pos + ' old telemetry data', "pushTelemetry");
          CLIQZEnvironment.trk = CLIQZEnvironment.trk.slice(slice_pos);
        }

        telemetrySending = [];
        telemetryReq = null;
      }

      return function(msg, instantPush) {
        if(msg.type != 'environment' && CLIQZEnvironment.isPrivate()) return; // no telemetry in private windows

        CLIQZEnvironment.log(msg, 'Utils.telemetry');
        if(!CLIQZEnvironment.getPref('telemetry', true))return;
        msg.session = CLIQZEnvironment.getPref('session');
        msg.ts = Date.now();
        msg.seq = getNextSeq();

        CLIQZEnvironment.trk.push(msg);
        CLIQZEnvironment.clearTimeout(trkTimer);
        if(instantPush || CLIQZEnvironment.trk.length % 100 == 0){
          pushTelemetry();
        } else {
          trkTimer = CLIQZEnvironment.setTimeout(pushTelemetry, 60000);
        }
      }
    })(),
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
    // from ContextMenu
    openPopup: function(contextMenu, ev, x, y) {
      contextMenu.openPopupAtScreen(x, y, false);
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
        var hist = null;

        return function(q, callback, sessionStart){
            if(hist === null) { //lazy
              // history autocomplete provider is removed
              // https://hg.mozilla.org/mozilla-central/rev/44a989cf6c16
              if (CliqzUtils.autocomplete.AB_1076_ACTIVE){
                CliqzUtils.log('AB - 1076: Initialize custom provider');
                // If AB 1076 is not in B or firefox version less than 49 it will fall back to firefox history
                var provider = Cc["@mozilla.org/autocomplete/search;1?name=cliqz-history-results"] ||
                               Cc["@mozilla.org/autocomplete/search;1?name=history"] ||
                               Cc["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"];
                hist = provider.getService(Ci["nsIAutoCompleteSearch"]);
              } else{
                var provider = Cc["@mozilla.org/autocomplete/search;1?name=history"] ||
                               Cc["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"];
                hist = provider.getService(Ci["nsIAutoCompleteSearch"]);
              }
            }
            // special case: user has deleted text from urlbar
            if(q.length != 0 && urlbar().value.length == 0)
              return;

            if(q.length == 0 && sessionStart){
                NewTabUtils.links.populateCache(function(){
                    callback(null, getTopSites());
                })
            }
            else {
                hist.startSearch(q, 'enable-actions', null, {
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

      var engines = CLIQZEnvironment.CliqzResultProviders.getSearchEngines(),
          defaultName = engines[0].name;

      se.forEach(function(def){
        engines.forEach(function(e){
          if(def.name == e.name){
              var url = def.base_url || e.base_url;

              def.code = e.code;
              def.style = CLIQZEnvironment.getLogoDetails(CLIQZEnvironment.getDetailsFromUrl(url)).style;
              def.text = e.prefix.slice(1);

              chosen.push(def)
          }
          if(e.default) defaultName = e.name;
        })
      })



      return CLIQZEnvironment.Result.cliqzExtra(
              {
                  data:
                  {
                      template:'noResult',
                      text_line1: CLIQZEnvironment.getLocalizedString('noResultTitle'),
                      // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
                      // we should take care of this specific case differently on alternative platforms
                      text_line2: CLIQZEnvironment.getLocalizedString('noResultMessage', defaultName),
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
  return CLIQZEnvironment.getWindow().CLIQZ.Core.urlbar;
}

function getTopSites(){
    var results = NewTabUtils.links.getLinks().slice(0, 5);
    if(results.length>0){
        var top = CLIQZEnvironment.Result.generic('cliqz-extra', '', null, '', null, '', null, JSON.stringify({topsites:true}));
        top.data.title = CLIQZEnvironment.getLocalizedString('topSitesTitle');
        top.data.message = CLIQZEnvironment.getLocalizedString('topSitesMessage');
        top.data.message1 = CLIQZEnvironment.getLocalizedString('topSitesMessage1');
        top.data.cliqz_logo = CLIQZEnvironment.SKIN_PATH + 'img/cliqz.svg';
        top.data.lastQ = CLIQZEnvironment.getWindow().gBrowser.selectedTab.cliqz;
        top.data.url = results[0].url;
        top.data.template = 'topsites';
        top.data.urls = results.map(function(r, i){
            var urlDetails = CLIQZEnvironment.getDetailsFromUrl(r.url),
                logoDetails = CLIQZEnvironment.getLogoDetails(urlDetails);

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

export default CLIQZEnvironment;
