import CLIQZEnvironment from "../platform/environment";
import console from "./console";
import prefs from "./prefs";
import Storage from "./storage";
import CliqzEvents from './events';
import tlds from "./tlds";
import { httpHandler, promiseHttpHandler } from './http';
import gzip from './gzip';
import CliqzLanguage from './language';
import { isUrl, isIpv4Address, isIpv6Address } from './url';
import random from './crypto/random';
import { fetchFactory } from '../platform/fetch';

var VERTICAL_ENCODINGS = {
    'people':'p',
    'news':'n',
    'video':'v',
    'hq':'h',
    'bm': 'm',
    'reciperd': 'r',
    'game': 'g',
    'movie': 'o'
};

var COLOURS = ['#ffce6d','#ff6f69','#96e397','#5c7ba1','#bfbfbf','#3b5598','#fbb44c','#00b2e5','#b3b3b3','#99cccc','#ff0027','#999999'],
    LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'],
    BRANDS_DATABASE = { domains: {}, palette: ["999"] };
const schemeRE = /^(\S+?):(\/\/)?(.*)$/i;

var CliqzUtils = {
  environment: CLIQZEnvironment,
  RESULTS_PROVIDER:               CLIQZEnvironment.RESULTS_PROVIDER,
  RICH_HEADER:                    CLIQZEnvironment.RICH_HEADER,
  RESULTS_PROVIDER_LOG:           'https://api.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING:          'https://api.cliqz.com/ping',
  CONFIG_PROVIDER:                'https://api.cliqz.com/api/v1/config',
  SAFE_BROWSING:                  'https://safe-browsing.cliqz.com',
  TUTORIAL_URL:                   'https://cliqz.com/home/onboarding',
  UNINSTALL:                      'https://cliqz.com/home/offboarding',
  FEEDBACK:                       'https://cliqz.com/feedback/',
  PREFERRED_LANGUAGE:             null,
  RESULTS_TIMEOUT:                CLIQZEnvironment.RESULTS_TIMEOUT,

  BRANDS_DATABASE: BRANDS_DATABASE,

  //will be updated from the mixer config endpoint every time new logos are generated
  BRANDS_DATABASE_VERSION: 1483980213630,
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
  hm: null,
  hw: null,
  mc: null,
  TEMPLATES_PATH: CLIQZEnvironment.TEMPLATES_PATH,
  TEMPLATES: CLIQZEnvironment.TEMPLATES,
  MESSAGE_TEMPLATES: CLIQZEnvironment.MESSAGE_TEMPLATES,
  PARTIALS: CLIQZEnvironment.PARTIALS,
  SKIN_PATH: CLIQZEnvironment.SKIN_PATH,
  LOCALE_PATH: CLIQZEnvironment.LOCALE_PATH,
  RERANKERS: CLIQZEnvironment.RERANKERS,
  CLIQZ_ONBOARDING: CLIQZEnvironment.CLIQZ_ONBOARDING,
  CLIQZ_ONBOARDING_URL: CLIQZEnvironment.CLIQZ_ONBOARDING_URL,
  BROWSER_ONBOARDING_PREF: CLIQZEnvironment.BROWSER_ONBOARDING_PREF,
  CLIQZ_NEW_TAB: CLIQZEnvironment.CLIQZ_NEW_TAB,
  CLIQZ_NEW_TAB_RESOURCE_URL: CLIQZEnvironment.CLIQZ_NEW_TAB_RESOURCE_URL,

  telemetryHandlers: [
    CLIQZEnvironment.telemetry
  ],

  init: function(options) {
    options = options || {};

    if (!options.lang) {
      return Promise.reject("lang missing");
    }

    CLIQZEnvironment.gzip = gzip;

    // cutting cyclic dependency
    CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails.bind(CliqzUtils);
    CLIQZEnvironment.getDetailsFromUrl = CliqzUtils.getDetailsFromUrl.bind(CliqzUtils);
    CLIQZEnvironment.getLocalizedString = CliqzUtils.getLocalizedString.bind(CliqzUtils);
    CLIQZEnvironment.app = CliqzUtils.app;
    CliqzUtils.log('Initialized', 'CliqzUtils');

    try {
      CliqzUtils.setLang(options.lang);
    } catch(e) {
      // TODO: fix for ghostery
    }

    CliqzUtils.tldExtractor = CLIQZEnvironment.tldExtractor || CliqzUtils.genericTldExtractor;
  },
  getLanguageFromLocale: function(locale) {
    return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
  },
  SUPPORTED_LANGS: {'de':'de', 'en':'en', 'fr':'fr'},
  getSupportedLanguage: function(lang) {
    return CliqzUtils.SUPPORTED_LANGS[lang] || 'en';
  },
  setLang: function (locale) {
    const lang = CliqzUtils.getLanguageFromLocale(locale);
    const supportedLang = CliqzUtils.getSupportedLanguage(lang);
    CliqzUtils.PREFERRED_LANGUAGE = locale;
    CliqzUtils.getLocaleFile(supportedLang);
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

  setLogoDb: function (db) {
    BRANDS_DATABASE = CliqzUtils.BRANDS_DATABASE = db;
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
      return httpHandler.apply(undefined, arguments);
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
  httpPut: function(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('PUT', url, callback, onerror, timeout, data);
  },
  getLocalStorage(url) {
    return new Storage(url);
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
  getPref: prefs.get,
  setPref: prefs.set,
  hasPref: prefs.has,
  clearPref: prefs.clear,
  log: function (msg, key) {
    console.log(key, msg);
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
          ret += space.charAt(Math.floor(random() * sLen));

      return ret;
  },
  hash: function(s){
    return s.split('').reduce(function(a,b){ return (((a<<4)-a)+b.charCodeAt(0)) & 0xEFFFFFF}, 0)
  },
  cleanMozillaActions: function(url = ''){
    if(url.indexOf("moz-action:") == 0) {
        var [, action, url] = url.match(/^moz-action:([^,]+),(.*)$/);
        try {
          // handle cases like: moz-action:visiturl,{"url": "..."}
          const mozActionUrl = JSON.parse(url).url;
          if (mozActionUrl) {
            url = decodeURIComponent(mozActionUrl);
          }
        } catch (e) {
        }
    }
    return [action, url];
  },
  cleanUrlProtocol: function(url, cleanWWW){
    if (!url)
      return '';

    // removes protocol if it's http(s). See CLIQZIUM-218.
    const urlLowered = url.toLowerCase();
    if (urlLowered.startsWith('http://'))
      url = url.slice(7);
    if (urlLowered.startsWith('https://'))
      url = url.slice(8);

    // removes the www.
    if (cleanWWW && url.toLowerCase().startsWith('www.'))
      url = url.slice(4);

    return url;
  },
  genericTldExtractor: tlds.getPublicSuffix,
  getDetailsFromUrl: function(originalUrl){
    var [action, originalUrl] = CliqzUtils.cleanMozillaActions(originalUrl);
    // exclude protocol
    var url = originalUrl,
        scheme = '',
        slashes = '',
        name = '',
        tld = '',
        subdomains = [],
        path = '',
        query ='',
        fragment = '';

    // remove scheme
    const schemeMatch = schemeRE.exec(url);
    if (schemeMatch) {
      scheme = schemeMatch[1];
      slashes = schemeMatch[2];
      url = schemeMatch[3];
    }
    const ssl = scheme == 'https';

    // separate hostname from path, etc. Could be separated from rest by /, ? or #
    var host = url.split(/[\/\#\?]/)[0].toLowerCase();
    var path = url.replace(host,'');

    // separate username:password@ from host
    var userpass_host = host.split('@');
    if(userpass_host.length > 1)
      host = userpass_host[1];

    // Parse Port number
    var port = "";

    var isIPv4 = isIpv4Address(host);
    var isIPv6 = isIpv6Address(host);

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

    isIPv4 = isIpv4Address(host);
    isIPv6 = isIpv6Address(host);
    var isLocalhost = CliqzUtils.isLocalhost(host, isIPv4, isIPv6);

    // find parts of hostname
    if (!isIPv4 && !isIPv6 && !isLocalhost) {
      try {
        let hostWithoutTld = host;
        tld = CliqzUtils.tldExtractor(host);

        if (tld) {
          hostWithoutTld = host.slice(0, -(tld.length + 1)); // +1 for the '.'
        }

        // Get subdomains
        subdomains = hostWithoutTld.split('.');
        // Get the domain name w/o subdomains and w/o TLD
        name = subdomains.pop();

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
    if (scheme && scheme != 'http' && scheme != 'https')
      friendly_url = scheme + ":" + slashes + friendly_url;
    //remove trailing slash from the end
    friendly_url = CliqzUtils.stripTrailingSlash(friendly_url);

    //Handle case where we have only tld for example http://cliqznas
    if(cleanHost === tld) {
      name = tld;
    }

    var urlDetails = {
              scheme: scheme ? scheme + ':' : '',
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
  isUrl,
  // Checks if the given string is a valid IPv4 addres
  isIPv4: isIpv4Address,
  isIPv6: isIpv6Address,

  isLocalhost: function(host, isIPv4, isIPv6) {
    if (host == "localhost") return true;
    if (isIPv4 && host.substr(0,3) == "127") return true;
    if (isIPv6 && host == "::1") return true;

    return false;

  },
  // checks if a value represents an url which is a seach engine
  isSearch: function(value){
    if (CliqzUtils.isUrl(value)) {
      const url = this.cleanMozillaActions(value)[1];
      const {name, subdomains, path} = CliqzUtils.getDetailsFromUrl(url);
      // allow only 'www' and 'de' (for Yahoo) subdomains to exclude 'maps.google.com' etc.
      // and empty path only to exclude 'www.google.com/maps' etc.
      const firstSubdomain = subdomains.length ? subdomains[0] : '';
      return (!path || (path.length === 1 && path[0] === '/')) && (
        (
          name === 'google' ||
          name === 'bing' ||
          name === 'duckduckgo' ||
          name === 'startpage'
        ) && (!firstSubdomain || firstSubdomain === 'www') ||
        (
          name === 'yahoo'
        ) && (!firstSubdomain || firstSubdomain === 'de'));
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

  getResultsProviderQueryString: function(q) {
    let numberResults = 5;
    if (CliqzUtils.getPref('languageDedup', false)) {
      numberResults = 7;
    }
    if (CliqzUtils.getPref('modules.context-search.enabled', false)) {
      numberResults = 10;
    }
    return encodeURIComponent(q) +
           CliqzUtils.encodeSessionParams() +
           CliqzLanguage.stateToQueryString() +
           CliqzUtils.encodeLocale() +
           CliqzUtils.encodeResultOrder() +
           CliqzUtils.encodeCountry() +
           CliqzUtils.encodeFilter() +
           CliqzUtils.encodeLocation(true) + // @TODO: remove true
           CliqzUtils.encodeResultCount(numberResults) +
           CliqzUtils.enncodeQuerySuggestionParam() +
           CliqzUtils.disableWikiDedup();
  },

  getRichHeaderQueryString: function(q, loc, locale) {
    let numberResults = 5;
    if (CliqzUtils.getPref('languageDedup', false)) {
      numberResults = 7;
    }
    if (CliqzUtils.getPref('modules.context-search.enabled', false)) {
      numberResults = 10;
    }
    return "&q=" + encodeURIComponent(q) + // @TODO: should start with &q=
            CliqzUtils.encodeSessionParams() +
            CliqzLanguage.stateToQueryString() +
            CliqzUtils.encodeLocale(locale) +
            CliqzUtils.encodeResultOrder() +
            CliqzUtils.encodeCountry() +
            CliqzUtils.encodeFilter() +
            CliqzUtils.encodeLocation(true, loc && loc.latitude, loc && loc.longitude) +
            CliqzUtils.encodeResultCount(numberResults) +
            CliqzUtils.disableWikiDedup();
  },

  getBackendResults: function(q) {
    if (!CliqzUtils.getPref('cliqzBackendProvider.enabled', true)) {
      return Promise.resolve({
        response: {
          results: [],
        },
        query: q
      });
    }

    CliqzUtils._sessionSeq++;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if (CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)){
      CliqzUtils._queryCount++;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;
    const url = CliqzUtils.RESULTS_PROVIDER + CliqzUtils.getResultsProviderQueryString(q);

    const fetch = fetchFactory();
    return fetch(url)
      .then(res => res.json())
      .then(response => ({
        response,
        query: q
      }));
  },

  // IP driven configuration
  fetchAndStoreConfig(){
    return new Promise(resolve => {
      CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER,
        function(res){
          if(res && res.response){
            try {
              var config = JSON.parse(res.response);
              for(var k in config){
                if (typeof config[k] == 'object') {
                  CliqzUtils.setPref('config_' + k, JSON.stringify(config[k]));
                } else {
                  CliqzUtils.setPref('config_' + k, config[k]);
                }
              }

              // we only set the prefered backend once at first start
              if (CliqzUtils.getPref('backend_country', '') === '') {
                // we fallback to german results if we did not decode the location
                CliqzUtils.setDefaultIndexCountry(CliqzUtils.getPref('config_location', 'de'));
              }
            } catch(e){
              CliqzUtils.log(e);
            }
          }
          resolve();
        },
        resolve, //on error the callback still needs to be called
        10000
      );
    });
  },
  setDefaultIndexCountry: function(country) {
    var supportedCountries = JSON.parse(CliqzUtils.getPref("config_backends", '["de"]'));
    if(supportedCountries.indexOf(country) !== -1){
      // supported country
      CliqzUtils.setPref('backend_country', country);
    } else {
      // unsupported country - fallback to
      //    'de' for german speaking users
      //    'en' for everybody else
      if(CliqzUtils.currLocale === 'de'){
        CliqzUtils.setPref('backend_country', 'de');
      } else {
        CliqzUtils.setPref('backend_country', 'us')
      }
    }
  },
  encodeLocale: function(locale) {
    var preferred = (CliqzUtils.PREFERRED_LANGUAGE || "");
    if(locale) {
      preferred = locale;
    }
    // send browser language to the back-end
    //return '&locale=' + (locale ? locale : (CliqzUtils.PREFERRED_LANGUAGE || ""));
    return '&locale='+ preferred;
  },
  encodeCountry: function() {
    return '&country=' + CliqzUtils.getPref('backend_country', 'de');
  },
  disableWikiDedup: function() {
    // disable wikipedia deduplication on the backend side
    var doDedup = CliqzUtils.getPref("languageDedup", false);
    if (doDedup) return '&ddl=0';
    else return ""
  },
  getAdultContentFilterState: function() {
    var data = {
      'conservative': 3,
      'moderate': 0,
      'liberal': 1
    },
    pref = CliqzUtils.getPref('adultContentFilter', 'moderate');
    return data[pref];
  },
  encodeFilter: function() {
    return '&adult=' + CliqzUtils.getAdultContentFilterState();
  },
  encodeResultCount: function(count) {
    count = count || 5;
    return '&count=' + count;
  },
  enncodeQuerySuggestionParam: function () {
    const suggestionsEnabled = CliqzUtils.getPref("suggestionsEnabled", false);
    return `&suggest=${suggestionsEnabled ? 1 : 0}`;
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
    let locationPref = CliqzUtils.getPref('share_location', 'ask');
    if (locationPref === 'showOnce') {
      locationPref = 'ask';
    }
    let qs = `&loc_pref=${locationPref}`;

    if (CliqzUtils.USER_LAT && CliqzUtils.USER_LNG || lat && lng) {
      qs += [
        '&loc=',
        lat || CliqzUtils.USER_LAT,
        ',',
        lng || CliqzUtils.USER_LNG,
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
  isPrivate: CLIQZEnvironment.isPrivate,
  telemetry: function () {
    const args = arguments;
    CliqzUtils.telemetryHandlers.forEach(handler => handler.apply(null, args));
  },
  resultTelemetry: function(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
    CliqzUtils.setResultOrder(resultOrder);
    CliqzEvents.pub("human-web:sanitize-result-telemetry",
      { type: 'extension-result-telemetry',
        q: query,
        s: CliqzUtils.encodeSessionParams(),
        msg: {
          i: resultIndex,
          o: CliqzUtils.encodeResultOrder(),
          u: (resultUrl ? resultUrl : ''),
          a: queryAutocompleted,
          e: extra
        },
        endpoint: CliqzUtils.RESULTS_PROVIDER_LOG,
        method: "GET",
      }
    );
    CliqzUtils.setResultOrder('');
  },
  sendUserFeedback(data) {
    data._type = 'user_feedback';
    // Params: method, url, resolve, reject, timeout, data
    httpHandler('POST', CLIQZEnvironment.LOG, null, null, 10000, JSON.stringify(data));
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
  Promise: CLIQZEnvironment.Promise,
  locale: {},
  currLocale: null,
  getLocaleFile: function (locale) {
    // locale file might not exist on mobile
    if (CliqzUtils.LOCALE_PATH) {
      const url = CliqzUtils.LOCALE_PATH + locale + '/cliqz.json';
      // Synchronous request is depricated
      const req = CliqzUtils.httpGet(url, null, null, null, null, true);
      CliqzUtils.currLocale = locale;
      CliqzUtils.locale.default = CliqzUtils.locale[locale] = JSON.parse(req.response);
    }
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
    let state = CliqzUtils.getPref('adultContentFilter', 'moderate');
    if (state === 'showOnce') {
      state = 'moderate';
    }
    data[state].selected = true;

    return data;
  },
  getLocationPermState(){
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

  // Returns result elements selecatble and navigatable from keyboard.
  // |container| search context, usually it's `CLIQZ.UI.gCliqzBox`.
  extractSelectableElements(container) {
    return Array.prototype.slice.call(
        container.querySelectorAll('[arrow]')).filter(
            function(el) {
              // dont consider hidden elements
              if(el.offsetParent == null)
                return false;

              if(!el.getAttribute('arrow-if-visible'))
                return true;

              // check if the element is visible
              //
              // for now this check is enough but we might be forced to switch to a
              // more generic approach - maybe using document.elementFromPoint(x, y)
              if (el.offsetLeft + el.offsetWidth > el.parentElement.offsetWidth)
                return false
              return true;
            });
  },

  getNoResults: CLIQZEnvironment.getNoResults,
  getParameterByName: function(name, location) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  },
  addEventListenerToElements: CLIQZEnvironment.addEventListenerToElements,
  search: CLIQZEnvironment.search,
  distance: function(lon1, lat1, lon2 = CliqzUtils.USER_LNG, lat2 = CliqzUtils.USER_LAT) {
    /** Converts numeric degrees to radians */
    function degreesToRad(degree){
      return degree * Math.PI / 180;
    }

    var R = 6371; // Radius of the earth in km
    if(!lon2 || !lon1 || !lat2 || !lat1) { return -1; }
    var dLat = degreesToRad(lat2-lat1);  // Javascript functions in radians
    var dLon = degreesToRad(lon2-lon1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(degreesToRad(lat1)) * Math.cos(degreesToRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
  },
  getDefaultSearchEngine: CLIQZEnvironment.getDefaultSearchEngine,
  copyResult: CLIQZEnvironment.copyResult,
  openPopup: CLIQZEnvironment.openPopup,
  isOnPrivateTab: CLIQZEnvironment.isOnPrivateTab,
  getAllCliqzPrefs: CLIQZEnvironment.getAllCliqzPrefs,
  isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser,
  setDefaultSearchEngine: CLIQZEnvironment.setDefaultSearchEngine,
  isUnknownTemplate: CLIQZEnvironment.isUnknownTemplate,
  getEngineByName: CLIQZEnvironment.getEngineByName,
  addEngineWithDetails: CLIQZEnvironment.addEngineWithDetails,
  getEngineByAlias: CLIQZEnvironment.getEngineByAlias,
  getSearchEngines: CLIQZEnvironment.getSearchEngines,
  blackListedEngines: CLIQZEnvironment.blackListedEngines,
  updateAlias: CLIQZEnvironment.updateAlias,
  openLink: CLIQZEnvironment.openLink,
  getCliqzPrefs() {
    function filterer(entry) {
        // avoid privay leaking prefs ('backup').
        // avoid irrelevant deep prefs (something.otherthing.x.y)
        // allow 'enabled' prefs
        return ((entry.indexOf('.') == -1 && entry.indexOf('backup') == -1)
                || entry.indexOf('.enabled') != -1);
      }

      let cliqzPrefs = {}
      let cliqzPrefsKeys = CliqzUtils.getAllCliqzPrefs().filter(filterer);

      for (let i = 0; i < cliqzPrefsKeys.length; i++) {
        cliqzPrefs[cliqzPrefsKeys[i]] = prefs.get(cliqzPrefsKeys[i]);
      }

      return cliqzPrefs;
  },
  promiseHttpHandler: promiseHttpHandler,
  registerResultProvider: function (o) {
    CLIQZEnvironment.CliqzResultProviders = o.ResultProviders;
    CLIQZEnvironment.Result = o.Result;
  },
  lastRenderedResults: [],
  lastRenderedURLs: [],
  lastSelection: -1,
  onRenderComplete: function onRenderComplete(query, box) {
    if (!CLIQZEnvironment.onRenderComplete) return;

    CliqzUtils.lastRenderedResults = this.extractSelectableElements(box).filter(function (node) {
      return !!(node.getAttribute("url") || node.getAttribute("href"));
    });
    CliqzUtils.lastRenderedURLs = CliqzUtils.lastRenderedResults
      .map(function (node) {
        return node.getAttribute("url") || node.getAttribute("href");
      });

    CLIQZEnvironment.onRenderComplete(query, CliqzUtils.lastRenderedURLs);
  },
  onSelectionChange: function onSelectionChange(element) {
    if (!element) return;

    var current = CliqzUtils.lastRenderedResults.indexOf(element);
    if (current == -1) {
      current = CliqzUtils.lastRenderedURLs.indexOf(
          element.getAttribute("url"));
    }

    if (CliqzUtils.lastSelection == current)
      return;
    CliqzUtils.lastSelection = current;

    if (!CLIQZEnvironment.onResultSelectionChange) return;
    CLIQZEnvironment.onResultSelectionChange(current);
  }
};

export default CliqzUtils;
