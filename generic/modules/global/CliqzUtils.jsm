'use strict';
/*
 * This module has a list of helpers used across the extension
 *  HTTP handlers
 *  URL manipulators
 *  Localization mechanics
 *  Common logging pipe
 *  Preferences(persistent storage) wrappers
 *  Browser helpers
 *  ...
 */
Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRequestMonitor',
  'chrome://cliqzmodules/content/CliqzRequestMonitor.jsm');

var EXPORTED_SYMBOLS = ['CliqzUtils'];

var VERTICAL_ENCODINGS = {
    'people':'p',
    'news':'n',
    'video':'v',
    'hq':'h',
    'bm': 'm',
    'recipeRD': 'r',
    'game': 'g',
    'movie': 'o'
};

var COLOURS = ['#ffce6d','#ff6f69','#96e397','#5c7ba1','#bfbfbf','#3b5598','#fbb44c','#00b2e5','#b3b3b3','#99cccc','#ff0027','#999999'],
    LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'],
    BRANDS_DATABASE = { domains: {}, palette: ["999"] }, brand_loaded = false,
    MINUTE = 60*1e3,
    ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])", // numbers 0 - 255
    ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "([:]([0-9])+)?$"), // port number
    ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");


var CliqzUtils = {
  LANGS:                          {'de':'de', 'en':'en', 'fr':'fr'},
  RESULTS_PROVIDER:               'https://newbeta.cliqz.com/api/v1/results?q=',
  RICH_HEADER:                    'https://newbeta.cliqz.com/api/v1/rich-header?path=/map',
  RESULTS_PROVIDER_LOG:           'https://newbeta.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING:          'https://newbeta.cliqz.com/ping',
  CONFIG_PROVIDER:                'https://newbeta.cliqz.com/api/v1/config',
  SAFE_BROWSING:                  'https://safe-browsing.cliqz.com',
  LOG:                            'https://logging.cliqz.com',
  TUTORIAL_URL:                   'https://cliqz.com/home/onboarding',
  UNINSTALL:                      'https://cliqz.com/home/offboarding',
  FEEDBACK:                       'https://cliqz.com/support',
  PREFERRED_LANGUAGE:             null,

  BRANDS_DATABASE: BRANDS_DATABASE,

  //will be updated from the mixer config endpoint every time new logos are generated
  BRANDS_DATABASE_VERSION: 1457952995848,
  GEOLOC_WATCH_ID:                null, // The ID of the geolocation watcher (function that updates cached geolocation on change)
  VERTICAL_TEMPLATES: {
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        'r': 'recipe' ,
        'g': 'cpgame_movie',
        'o': 'cpgame_movie'
    },
  TEMPLATES_PATH: CLIQZEnvironment.TEMPLATES_PATH,
  init: function(win){
    if (win && win.navigator) {
        // See http://gu.illau.me/posts/the-problem-of-user-language-lists-in-javascript/
        var nav = win.navigator;
        CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en',
        CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
    }

    if(!brand_loaded){
      brand_loaded = true;

      var config = this.getPref("config_logoVersion"), dev = this.getPref("brands-database-version");

      if (dev) this.BRANDS_DATABASE_VERSION = dev
      else if (config) this.BRANDS_DATABASE_VERSION = config

      var retryPattern = [60*MINUTE, 10*MINUTE, 5*MINUTE, 2*MINUTE, MINUTE];

      (function getLogoDB(url){

          CliqzUtils && CliqzUtils.httpGet(url,
          function(req){
            CliqzUtils.BRANDS_DATABASE =  BRANDS_DATABASE = JSON.parse(req.response); },
          function(){
            var retry = retryPattern.pop();
            if(retry) CliqzUtils.setTimeout(getLogoDB, retry, url);
          }
          , MINUTE/2);
      })(CLIQZEnvironment.getBrandsDBUrl(this.BRANDS_DATABASE_VERSION));
    }

    CliqzUtils.requestMonitor = new CliqzRequestMonitor();
    CliqzUtils.log('Initialized', 'CliqzUtils');
  },

  initPlatform: function(System) {
    System.baseURL = CLIQZEnvironment.SYSTEM_BASE_URL;
    CliqzUtils.System = System;
  },

  importModule: function(moduleName) {
    return CliqzUtils.System.import(moduleName)
  },

  isNumber: function(n){
      /*
      NOTE: this function can't recognize numbers in the form such as: "1.2B", but it can for "1e4". See specification for isFinite()
       */
      return !isNaN(parseFloat(n)) && isFinite(n);
  },

  //returns the type only if it is known
  getKnownType: function(type){
    return VERTICAL_ENCODINGS.hasOwnProperty(type) && type;
  },

  /**
   * Construct a uri from a url
   * @param {string}  aUrl - url
   * @param {string}  aOriginCharset - optional character set for the URI
   * @param {nsIURI}  aBaseURI - base URI for the spec
   */
  makeUri: CLIQZEnvironment.makeUri,

  //move this out of CliqzUtils!
  setSupportInfo: function(status){
    var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
        host = 'firefox', hostVersion='';

    //check if the prefs exist and if they are string
    if(prefs.getPrefType('distribution.id') == 32 && prefs.getPrefType('distribution.version') == 32){
      host = prefs.getCharPref('distribution.id');
      hostVersion = prefs.getCharPref('distribution.version');
    }
    var info = JSON.stringify({
          version: CliqzUtils.extensionVersion,
          host: host,
          hostVersion: hostVersion,
          status: status != undefined ? status : "active"
        }),
        sites = ["http://cliqz.com","https://cliqz.com"]

    sites.forEach(function(url){
        var ls = CLIQZEnvironment.getLocalStorage(url)

        if (ls) ls.setItem("extension-info",info)
    })
  },
  getLogoDetails: function(urlDetails){
    var base = urlDetails.name,
        baseCore = base.replace(/[-]/g, ""),
        check = function(host,rule){
          var address = host.lastIndexOf(base), parseddomain = host.substr(0,address) + "$" + host.substr(address + base.length)

          return parseddomain.indexOf(rule) != -1
        },
        result = {},
        domains = BRANDS_DATABASE.domains;



    if(base.length == 0)
      return result;

    if (base == "IP") result = { text: "IP", backgroundColor: "9077e3" }

    else if (domains[base]) {
      for (var i=0,imax=domains[base].length;i<imax;i++) {
        var rule = domains[base][i] // r = rule, b = background-color, l = logo, t = text, c = color

        if (i == imax - 1 || check(urlDetails.host,rule.r)) {
          result = {
            backgroundColor: rule.b?rule.b:null,
            backgroundImage: rule.l?"url(https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/logos/" + base + "/" + rule.r + ".svg)":"",
            text: rule.t,
            color: rule.c?"":"#fff"
          }

          break
        }
      }
    }
    result.text = result.text || (baseCore.length > 1 ? ((baseCore[0].toUpperCase() + baseCore[1].toLowerCase())) : "")
    result.backgroundColor = result.backgroundColor || BRANDS_DATABASE.palette[base.split("").reduce(function(a,b){ return a + b.charCodeAt(0) },0) % BRANDS_DATABASE.palette.length]
    var colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor),
        buttonClass = BRANDS_DATABASE.buttons && colorID != -1 && BRANDS_DATABASE.buttons[colorID]?BRANDS_DATABASE.buttons[colorID]:10

    result.buttonsClass = "cliqz-brands-button-" + buttonClass
    result.style = "background-color: #" + result.backgroundColor + ";color:" + (result.color || '#fff') + ";"


    if (result.backgroundImage) result.style += "background-image:" + result.backgroundImage + "; text-indent: -10em;"

    return result
  },
  httpHandler: function () {
    var errorHandler = arguments[3]; // see httpGet or httpPost arguments
    try {
      return CLIQZEnvironment.httpHandler.apply(CLIQZEnvironment, arguments);
    } catch(e) {
      if(errorHandler) {
        errorHandler(e);
      } else {
        CliqzUtils.log(e, "httpHandler failed");
      }
    }
  },
  httpGet: function(url, callback, onerror, timeout, _, sync){
    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout, _, sync);
  },
  httpPost: function(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
  },
  promiseHttpHandler: function() {
    return CLIQZEnvironment.promiseHttpHandler.apply(CLIQZEnvironment, arguments);
  },
  /**
   * Loads a resource URL from the xpi.
   *
   * Wraps httpGet in a try-catch clause. We need to do this, because when
   * trying to load a non-existing file from an xpi via xmlhttprequest, Firefox
   * throws a NS_ERROR_FILE_NOT_FOUND exception instead of calling the onerror
   * function.
   *
   * @see https://bugzilla.mozilla.org/show_bug.cgi?id=827243 (probably).
   */
  loadResource: function(url, callback, onerror) {
    try {
        return CliqzUtils.httpGet(url, callback, onerror, 3000);
    } catch (e) {
      CliqzUtils.log("Could not load resource " + url + " from the xpi",
                     "CliqzUtils.httpHandler");
      onerror && onerror();
    }
  },
  openTabInWindow: CLIQZEnvironment.openTabInWindow,
  /**
   * Get a value from preferences db
   * @param {string}  pref - preference identifier
   * @param {*=}      defautlValue - returned value in case pref is not defined
   * @param {string=} prefix - prefix for pref
   */
  getPref: CLIQZEnvironment.getPref,
  /**
   * Set a value in preferences db
   * @param {string}  pref - preference identifier
   * @param {*=}      defautlValue - returned value in case pref is not defined
   * @param {string=} prefix - prefix for pref
   */
  setPref: CLIQZEnvironment.setPref,
  /**
   * Check if there is a value in preferences db
   * @param {string}  pref - preference identifier
   * @param {string=} prefix - prefix for pref
   */
  hasPref: CLIQZEnvironment.hasPref,
  /**
   * Clear value in preferences db
   * @param {string}  pref - preference identifier
   * @param {string=} prefix - prefix for pref
   */
  clearPref: CLIQZEnvironment.clearPref,
  log: function(msg, key){
    if(CliqzUtils && CliqzUtils.getPref('showConsoleLogs', false)){
      var ignore = JSON.parse(CliqzUtils.getPref('showConsoleLogsIgnore', '[]'))
      if(ignore.indexOf(key) == -1) // only show the log message, if key is not in ignore list
        CLIQZEnvironment.log(msg, key);
    }
  },
  getDay: function() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  //creates a random 'len' long string from the input space
  rand: function(len, _space){
      var ret = '', i,
          space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          sLen = space.length;

      for(i=0; i < len; i++ )
          ret += space.charAt(Math.floor(Math.random() * sLen));

      return ret;
  },
  hash: function(s){
    return s.split('').reduce(function(a,b){ return (((a<<4)-a)+b.charCodeAt(0)) & 0xEFFFFFF}, 0)
  },
  cleanMozillaActions: function(url){
    if(url.indexOf("moz-action:") == 0) {
        //var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$/);
        url = url.match(/^moz-action:([^,]+),(.*)$/)[2];
    }
    return url;
  },
  cleanUrlProtocol: function(url, cleanWWW){
    if(!url) return '';

    var protocolPos = url.indexOf('://');

    // removes protocol http(s), ftp, ...
    if(protocolPos != -1 && protocolPos <= 6)
      url = url.split('://')[1];

    // removes the www.
    if(cleanWWW && url.toLowerCase().indexOf('www.') == 0)
      url = url.slice(4);

    return url;
  },
  getDetailsFromUrl: function(originalUrl){
    originalUrl = CliqzUtils.cleanMozillaActions(originalUrl);
    // exclude protocol
    var url = originalUrl,
        name = '',
        tld = '',
        subdomains = [],
        path = '',
        query ='',
        fragment = '',
        ssl = originalUrl.indexOf('https') == 0;

    // remove scheme
    url = CliqzUtils.cleanUrlProtocol(url, false);
    var scheme = originalUrl.replace(url, '').replace('//', '');

    // separate hostname from path, etc. Could be separated from rest by /, ? or #
    var host = url.split(/[\/\#\?]/)[0].toLowerCase();
    var path = url.replace(host,'');

    // separate username:password@ from host
    var userpass_host = host.split('@');
    if(userpass_host.length > 1)
      host = userpass_host[1];

    // Parse Port number
    var port = "";

    var isIPv4 = ipv4_regex.test(host);
    var isIPv6 = ipv6_regex.test(host);


    var indexOfColon = host.indexOf(":");
    if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
      port = host.substr(indexOfColon+1);
      host = host.substr(0,indexOfColon);
    }
    else if (isIPv6) {
      // If an IPv6 address has a port number, it will be right after a closing bracket ] : format [ip_v6]:port
      var endOfIP = host.indexOf(']:');
      if (endOfIP >= 0) {
        port = host.split(']:')[1];
        host = host.split(']:')[0].replace('[','').replace(']','');
      }
    }

    // extract query and fragment from url
    var query = '';
    var query_idx = path.indexOf('?');
    if(query_idx != -1) {
      query = path.substr(query_idx+1);
    }

    var fragment = '';
    var fragment_idx = path.indexOf('#');
    if(fragment_idx != -1) {
      fragment = path.substr(fragment_idx+1);
    }

    // remove query and fragment from path
    path = path.replace('?' + query, '');
    path = path.replace('#' + fragment, '');
    query = query.replace('#' + fragment, '');

    // extra - all path, query and fragment
    var extra = path;
    if(query)
      extra += "?" + query;
    if(fragment)
      extra += "#" + fragment;

    isIPv4 = ipv4_regex.test(host);
    isIPv6 = ipv6_regex.test(host);
    var isLocalhost = CliqzUtils.isLocalhost(host, isIPv4, isIPv6);

    // find parts of hostname
    if (!isIPv4 && !isIPv6 && !isLocalhost) {
      try {
        tld = CLIQZEnvironment.tldExtractor(host);

        // Get the domain name w/o subdomains and w/o TLD
        name = host.slice(0, -(tld.length+1)).split('.').pop(); // +1 for the '.'

        // Get subdomains
        var name_tld = name + "." + tld;
        subdomains = host.slice(0, -name_tld.length).split(".").slice(0, -1);

        //remove www if exists
        // TODO: I don't think this is the right place to do this.
        //       Disabled for now, but check there are no issues.
        // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
      } catch(e){
        name = "";
        host = "";
        //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
      }
    }
    else {
      name = isLocalhost ? "localhost" : "IP";
    }

    // remove www from beginning, we need cleanHost in the friendly url
    var cleanHost = host;
    if(host.toLowerCase().indexOf('www.') == 0) {
      cleanHost = host.slice(4);
    }

    var friendly_url = cleanHost + extra;
    //remove trailing slash from the end
    friendly_url = CliqzUtils.stripTrailingSlash(friendly_url);

    //Handle case where we have only tld for example http://cliqznas
    if(cleanHost === tld) {
      name = tld;
    }

    var urlDetails = {
              scheme: scheme,
              name: name,
              domain: tld ? name + '.' + tld : '',
              tld: tld,
              subdomains: subdomains,
              path: path,
              query: query,
              fragment: fragment,
              extra: extra,
              host: host,
              cleanHost: cleanHost,
              ssl: ssl,
              port: port,
              friendly_url: friendly_url
        };

    return urlDetails;
  },
  stripTrailingSlash: function(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
  },
  _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
  isUrl: function(input){
    //step 1 remove eventual protocol
    var protocolPos = input.indexOf('://');
    if(protocolPos != -1 && protocolPos <= 6){
      input = input.slice(protocolPos+3)
    }
    //step2 remove path & everything after
    input = input.split('/')[0];
    //step3 run the regex
    return CliqzUtils._isUrlRegExp.test(input);
  },


  // Chechks if the given string is a valid IPv4 addres
  isIPv4: function(input) {
    var ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; // numbers 0 - 255
    var ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part
    + "([:]([0-9])+)?$"); // port number
    return ipv4_regex.test(input);
  },

  isIPv6: function(input) {

    // Currently using a simple regex for "what looks like an IPv6 address" for readability
    var ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$")
    return ipv6_regex.test(input);

    /* A better (more precise) regex to validate IPV6 addresses from StackOverflow:
    link: http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses

    var ipv6_regex = new RegExp("(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:)"
    + "{1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,"
    + "4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a"
    + "-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}"
    + "|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])"
    + "|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))");
    */
  },

  isLocalhost: function(host, isIPv4, isIPv6) {
    if (host == "localhost") return true;
    if (isIPv4 && host.substr(0,3) == "127") return true;
    if (isIPv6 && host == "::1") return true;

    return false;

  },

  // checks if a value represents an url which is a seach engine
  isSearch: function(value){
    if(CliqzUtils.isUrl(value)){
       return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true: false;
    }
    return false;
  },
  // checks if a string is a complete url
  isCompleteUrl: function(input){
    var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  // extract query term from search engine result page URLs
  extractQueryFromUrl: function(url) {
    // Google
    if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      url = url.substring(url.lastIndexOf('q=') + 2).split('&')[0];
    // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      url = url.substring(url.indexOf('q=') + 2).split('&')[0];
    // Yahoo
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      url = url.substring(url.indexOf('p=') + 2).split('&')[0];
    } else {
      url = null;
    }
    var decoded = url ? decodeURIComponent(url.replace(/\+/g,' ')) : null;
    if (decoded) return decoded;
    else return url;
  },
  // Remove clutter (http, www) from urls
  generalizeUrl: function(url, skipCorrection) {
    if (!url) {
      return '';
    }
    var val = url.toLowerCase();
    var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
      host = cleanParts[0],
      pathLength = 0,
      SYMBOLS = /,|\./g;
    if (!skipCorrection) {
      if (cleanParts.length > 1) {
        pathLength = ('/' + cleanParts.slice(1).join('/')).length;
      }
      if (host.indexOf('www') === 0 && host.length > 4) {
        // only fix symbols in host
        if (SYMBOLS.test(host[3]) && host[4] != ' ')
        // replace only issues in the host name, not ever in the path
          val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
          (pathLength ? val.substr(-pathLength) : '');
      }
    }
    url = CliqzUtils.cleanUrlProtocol(val, true);
    return url[url.length - 1] == '/' ? url.slice(0,-1) : url;
  },
  // Remove clutter from urls that prevents pattern detection, e.g. checksum
  simplifyUrl: function(url) {
    var q;
    // Google redirect urls
    if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
      // Return target URL instead
      url = url.substring(url.lastIndexOf('url=')).split('&')[0];
      url = url.substr(4);
      return decodeURIComponent(url);

      // Remove clutter from Google searches
    } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.lastIndexOf('q=')).split('&')[0];
      if (q != 'q=') {
        // tbm defines category (images/news/...)
        var param = url.indexOf('#') != -1 ? url.substr(url.indexOf('#')) : url.substr(url.indexOf('?'));
        var tbm = param.indexOf('tbm=') != -1 ? ('&' + param.substring(param.lastIndexOf('tbm=')).split('&')[0]) : '';
        var page = param.indexOf('start=') != -1 ? ('&' + param.substring(param.lastIndexOf('start=')).split('&')[0]) : '';
        return 'https://www.google.com/search?' + q + tbm /*+ page*/;
      } else {
        return url;
      }
      // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.indexOf('q=')).split('&')[0];
      if (q != 'q=') {
        if (url.indexOf('search?') != -1)
          return url.substr(0, url.indexOf('search?')) + 'search?' + q;
        else
          return url.substr(0, url.indexOf('/?')) + '/?' + q;
      } else {
        return url;
      }
      // Yahoo redirect
    } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
      url = url.substring(url.lastIndexOf('/RU=')).split('/RK=')[0];
      url = url.substr(4);
      return decodeURIComponent(url);
      // Yahoo
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      var p = url.substring(url.indexOf('p=')).split('&')[0];
      if (p != 'p=' && url.indexOf(';') != -1) {
        return url.substr(0, url.indexOf(';')) + '?' + p;
      } else {
        return url;
      }
    } else {
      return url;
    }
  },
  // establishes the connection
  pingCliqzResults: function(){
    CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
  },
  getCliqzResults: function(q, callback){
    CliqzUtils._sessionSeq++;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if(CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)){
      CliqzUtils._queryCount++;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;

    var url = CliqzUtils.RESULTS_PROVIDER +
              encodeURIComponent(q) +
              CliqzUtils.encodeSessionParams() +
              CliqzLanguage.stateToQueryString() +
              CliqzUtils.encodeLocale() +
              CliqzUtils.encodeResultOrder() +
              CliqzUtils.encodeCountry() +
              CliqzUtils.encodeFilter() +
              CliqzUtils.encodeLocation();

    var req = CliqzUtils.httpGet(url, function (res) {
      callback && callback(res, q);
    });

    // Currently when HPN is live, this guy breaks.
    if(req) CliqzUtils.requestMonitor.addRequest(req);
  },
  // IP driven configuration
  fetchAndStoreConfig: function(callback){
    CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER,
      function(res){
        if(res && res.response){
          try {
            var config = JSON.parse(res.response);
            for(var k in config){
              CliqzUtils.setPref('config_' + k, config[k]);
            }
          } catch(e){}
        }

        callback();
      },
      callback, //on error the callback still needs to be called
      2000
    );
  },
  encodeLocale: function() {
    // send browser language to the back-end
    return '&locale='+ (CliqzUtils.PREFERRED_LANGUAGE || "");
  },
  encodeCountry: function() {
    //international results not supported
    return '&force_country=true';
  },
  encodeFilter: function() {
    var data = {
      'conservative': 3,
      'moderate': 0,
      'liberal': 1
    },
    state = data[CliqzUtils.getPref('adultContentFilter', 'moderate')];

    return '&adult='+state;
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return ['T'];
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type.indexOf('cliqz-pattern') == 0) return ['C'];
    else if(type === 'cliqz-extra') return ['X'];
    else if(type === 'cliqz-series') return ['S'];

    else if(type.indexOf('bookmark') == 0 ||
            type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    // cliqz type = "cliqz-custom sources-X"
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type; //should never happen
  },
  //eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
  isPrivateResultType: function(type) {
    var onlyType = type[0].split('|')[0];
    return 'HBTCS'.indexOf(onlyType) != -1 && type.length == 1;
  },
  // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
  encodeCliqzResultType: function(type){
    var pos = type.indexOf('sources-')
    if(pos != -1)
      return CliqzUtils.encodeSources(type.substr(pos+8));
    else
      return [];
  },
  // random ID generated at each urlbar focus
  _searchSession: '',
  // number of sequences in each session
  _sessionSeq: 0,
  _queryLastLength: null,
  _queryLastDraw: null,
  // number of queries in search session
  _queryCount: null,
  setSearchSession: function(rand){
    CliqzUtils._searchSession = rand;
    CliqzUtils._sessionSeq = 0;
    CliqzUtils._queryCount = 0;
    CliqzUtils._queryLastLength = 0;
    CliqzUtils._queryLastDraw = 0;
  },
  encodeSessionParams: function(){
    if(CliqzUtils._searchSession.length){
      return '&s=' + encodeURIComponent(CliqzUtils._searchSession) +
             '&n=' + CliqzUtils._sessionSeq +
             '&qc=' + CliqzUtils._queryCount
    } else return '';
  },

  encodeLocation: function(specifySource, lat, lng) {
    var qs = [
     '&loc_pref=',
     CliqzUtils.getPref('share_location','ask')
    ].join('')

    if (CLIQZEnvironment.USER_LAT && CLIQZEnvironment.USER_LNG || lat && lng) {
      qs += [
        '&loc=',
        lat || CLIQZEnvironment.USER_LAT,
        ',',
        lng || CLIQZEnvironment.USER_LNG,
        (specifySource ? ',U' : '')
      ].join('');
    }

    return qs;
  },
  encodeSources: function(sources){
    return sources.toLowerCase().split(', ').map(
      function(s){
        if(s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
          return 'd'
        else
          return VERTICAL_ENCODINGS[s] || s;
      });
  },
  combineSources: function(internal, cliqz){
    // do not add extra sources to end of EZs
    if(internal == "cliqz-extra")
      return internal;

    var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))
    return internal + " " + cliqz_sources
  },
  isPrivate: CLIQZEnvironment.isPrivate,
  telemetry: CLIQZEnvironment.telemetry,
  resultTelemetry: function(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
    var current_window = CliqzUtils.getWindow();
    if(current_window && CliqzUtils.isPrivate(current_window)) return; // no telemetry in private windows

    CliqzUtils.setResultOrder(resultOrder);
    var params = encodeURIComponent(query) +
      (queryAutocompleted ? '&a=' + encodeURIComponent(queryAutocompleted) : '') +
      '&i=' + resultIndex +
      (resultUrl ? '&u=' + encodeURIComponent(resultUrl) : '') +
      CliqzUtils.encodeSessionParams() +
      CliqzUtils.encodeResultOrder() +
      (extra ? '&e=' + extra : '')
    CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER_LOG + params);
    CliqzUtils.setResultOrder('');
    CliqzUtils.log(params, 'Utils.resultTelemetry');
  },
  _resultOrder: '',
  setResultOrder: function(resultOrder) {
    CliqzUtils._resultOrder = resultOrder;
  },
  encodeResultOrder: function() {
    return CliqzUtils._resultOrder && CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(JSON.stringify(CliqzUtils._resultOrder)) : '';
  },
  setInterval: CLIQZEnvironment.setInterval,
  setTimeout: CLIQZEnvironment.setTimeout,
  clearTimeout: CLIQZEnvironment.clearTimeout,
  clearInterval: CLIQZEnvironment.clearTimeout,
  locale: {},
  currLocale: null,
  loadLocale : function(lang_locale){
    // The default language
    if (!CliqzUtils.locale.hasOwnProperty('default')) {
        CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + 'de/cliqz.json',
            function(req){
                if(CliqzUtils) CliqzUtils.locale['default'] = JSON.parse(req.response);
            });
    }
    if (!CliqzUtils.locale.hasOwnProperty(lang_locale)) {
        CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + encodeURIComponent(lang_locale) + '/cliqz.json',
            function(req) {
                if(CliqzUtils){
                  CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                  CliqzUtils.currLocale = lang_locale;
                }
            },
            function() {
                // We did not find the full locale (e.g. en-GB): let's try just the
                // language!
                var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
                if(CliqzUtils){
                  CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + loc + '/cliqz.json',
                      function(req) {
                        if(CliqzUtils){
                          CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                          CliqzUtils.currLocale = lang_locale;
                        }
                      }
                  );
                }
            }
        );
    }
  },
  getLanguageFromLocale: function(locale){
    return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
  },
  getLanguage: function(win){
    return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
  },
  getLocalizedString: function(key, substitutions){
    if(!key) return '';

    var str = key,
        localMessages;

    if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale]
            && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
        str = CliqzUtils.locale[CliqzUtils.currLocale][key].message;
        localMessages = CliqzUtils.locale[CliqzUtils.currLocale];
    } else if (CliqzUtils.locale.default && CliqzUtils.locale.default[key]) {
        str = CliqzUtils.locale.default[key].message;
        localMessages = CliqzUtils.locale.default;
    }

    if (!substitutions) {
      substitutions = [];
    }
    if (!Array.isArray(substitutions)) {
      substitutions = [substitutions];
    }

    function replacer(matched, index, dollarSigns) {
      if (index) {
        index = parseInt(index, 10) - 1;
        return index in substitutions ? substitutions[index] : "";
      } else {
        // For any series of contiguous `$`s, the first is dropped, and
        // the rest remain in the output string.
        return dollarSigns;
      }
    }
    return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
  },
  // gets all the elements with the class 'cliqz-locale' and adds
  // the localized string - key attribute - as content
  localizeDoc: function(doc){
    var locale = doc.getElementsByClassName('cliqz-locale');
    for(var i = 0; i < locale.length; i++){
        var el = locale[i];
        el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
    }
  },
  extensionRestart: function(changes){
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win.CLIQZ && win.CLIQZ.Core){
        win.CLIQZ.Core.unload(true);
      }
    }

    changes && changes();

    var corePromises = [];
    enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win.CLIQZ && win.CLIQZ.Core){
        corePromises.push(win.CLIQZ.Core.init());
      }
    }

    return Promise.all(corePromises);
  },
  isWindows: function(){
    return CLIQZEnvironment.OS.indexOf("win") === 0;
  },
  isMac: function(){
    return CLIQZEnvironment.OS.indexOf("darwin") === 0;
  },
  isLinux: function() {
    return CLIQZEnvironment.OS.indexOf("linux") === 0;
  },
  getWindow: CLIQZEnvironment.getWindow,
  getWindowID: CLIQZEnvironment.getWindowID,
  hasClass: function(element, className) {
    return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
  },
  /**
   * Bind functions contexts to a specified object.
   * @param {Object} from - An object, whose function properties will be processed.
   * @param {Object} to - An object, which will be the context (this) of processed functions.
   */
  bindObjectFunctions: function(from, to) {
    for (var funcName in from) {
      var func = from[funcName];
      if (!from.hasOwnProperty(funcName))
        continue;
      // Can't compare with prototype of object from a different module.
      if (typeof func != "function")
        continue;
      from[funcName] = func.bind(to);
    }
  },
  tryDecodeURIComponent: function(s) {
    // avoide error from decodeURIComponent('%2')
    try {
      return decodeURIComponent(s);
    } catch(e) {
      return s;
    }
  },
  tryEncodeURIComponent: function(s) {
    try {
      return encodeURIComponent(s);
    } catch(e) {
      return s;
    }
  },
  parseQueryString: function(qstr) {
    var query = {};
    var a = (qstr || '').split('&');
    for (var i in a)
    {
      var b = a[i].split('=');
      query[CliqzUtils.tryDecodeURIComponent(b[0])] = CliqzUtils.tryDecodeURIComponent(b[1]);
    }

    return query;
  },
  roundToDecimal: function(number, digits) {
    var multiplier = Math.pow(10, digits);
    return Math.round(number * multiplier) / multiplier;
  },
  getAdultFilterState: function(){
    var data = {
      'conservative': {
              name: CliqzUtils.getLocalizedString('always'),
              selected: false
      },
      'moderate': {
              name: CliqzUtils.getLocalizedString('always_ask'),
              selected: false
      },
      'liberal': {
          name: CliqzUtils.getLocalizedString('never'),
          selected: false
      }
    };

    data[CliqzUtils.getPref('adultContentFilter', 'moderate')].selected = true;

    return data;
  },
  getNoResults: CLIQZEnvironment.getNoResults,
  getParameterByName: function(name, location) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }
};
