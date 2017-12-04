import config from '../core/config';
import CLIQZEnvironment from "../platform/environment";
import console from "./console";
import prefs from "./prefs";
import Storage from "./storage";
import CliqzEvents from './events';
import tlds from "./tlds";
import { httpHandler, promiseHttpHandler } from './http';
import gzip from './gzip';
import CliqzLanguage from './language';
import * as url from './url';
import random from './crypto/random';
import { fetchFactory } from '../platform/fetch';
import { isWindows, isLinux, isMac, isMobile } from './platform';
import i18n, { getMessage, getLanguageFromLocale } from './i18n';
import historySearch from '../platform/history/search';

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


var CliqzUtils = {
  environment: CLIQZEnvironment,
  RESULTS_PROVIDER:               CLIQZEnvironment.RESULTS_PROVIDER,
  RICH_HEADER:                    CLIQZEnvironment.RICH_HEADER,
  RESULTS_PROVIDER_LOG:           'https://api.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING:          'https://api.cliqz.com/ping',
  SAFE_BROWSING:                  'https://safe-browsing.cliqz.com',
  TUTORIAL_URL:                   'https://cliqz.com/home/onboarding',
  UNINSTALL:                      'https://cliqz.com/home/offboarding',
  FEEDBACK:                       'https://cliqz.com/feedback/',
  get FEEDBACK_URL() {
    return `${this.FEEDBACK}${this.VERSION}-${config.settings.channel}`;
  },
  RESULTS_TIMEOUT:                CLIQZEnvironment.RESULTS_TIMEOUT,

  BRANDS_DATABASE: BRANDS_DATABASE,

  //will be updated from the mixer config endpoint every time new logos are generated
  BRANDS_DATABASE_VERSION: 1509099586511,
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
  RERANKERS: CLIQZEnvironment.RERANKERS,
  CLIQZ_ONBOARDING: CLIQZEnvironment.CLIQZ_ONBOARDING,
  CLIQZ_ONBOARDING_URL: CLIQZEnvironment.CLIQZ_ONBOARDING_URL,
  BROWSER_ONBOARDING_PREF: CLIQZEnvironment.BROWSER_ONBOARDING_PREF,
  telemetryHandlers: [
    CLIQZEnvironment.telemetry
  ],

  init() {
    CLIQZEnvironment.gzip = gzip;

    // cutting cyclic dependency
    CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails.bind(CliqzUtils);
    CLIQZEnvironment.getDetailsFromUrl = CliqzUtils.getDetailsFromUrl.bind(CliqzUtils);
    CLIQZEnvironment.getLocalizedString = CliqzUtils.getLocalizedString.bind(CliqzUtils);
    CLIQZEnvironment.app = CliqzUtils.app;
    CliqzUtils.log('Initialized', 'CliqzUtils');

    CliqzUtils.tldExtractor = CLIQZEnvironment.tldExtractor || CliqzUtils.genericTldExtractor;
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
    result.text = result.text || `${baseCore[0] || ''}${baseCore[1] || ''}`.toLowerCase();
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
  cleanMozillaActions: url.cleanMozillaActions,
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
  getDetailsFromUrl: url.getDetailsFromUrl,
  stripTrailingSlash: url.stripTrailingSlash,
  isUrl: url.isUrl,
  stripTrailingSlash: function(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
  },
  // Checks if the given string is a valid IPv4 addres
  isIPv4: url.isIpv4Address,
  isIPv6: url.isIpv6Address,

  isLocalhost: url.isLocalhost,
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
           CliqzUtils.encodePlatform() +
           CliqzUtils.encodeResultOrder() +
           CliqzUtils.encodeCountry() +
           CliqzUtils.encodeFilter() +
           CliqzUtils.encodeLocation(true) + // @TODO: remove true
           CliqzUtils.encodeResultCount(numberResults) +
           CliqzUtils.enncodeQuerySuggestionParam() +
           CliqzUtils.disableWikiDedup();
  },

  getRichHeaderQueryString: function(q, loc) {
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
            CliqzUtils.encodeLocale() +
            CliqzUtils.encodePlatform() +
            CliqzUtils.encodeResultOrder() +
            CliqzUtils.encodeCountry() +
            CliqzUtils.encodeFilter() +
            CliqzUtils.encodeLocation(true, loc && loc.latitude, loc && loc.longitude) +
            CliqzUtils.encodeResultCount(numberResults) +
            CliqzUtils.disableWikiDedup();
  },
  // used in testing only
  fetchFactory() {
    return fetchFactory();
  },

  getBackendResults: function(q) {
    const url = CliqzUtils.RESULTS_PROVIDER + CliqzUtils.getResultsProviderQueryString(q);
    const fetch = CliqzUtils.fetchFactory();
    const suggestionChoice = CliqzUtils.getPref('suggestionChoice', 0);
    const isOldMixer = CliqzUtils.getPref('searchMode', 'autocomplete') === 'autocomplete';
    const isPrivateMode = CliqzUtils.isPrivateMode();

    CliqzUtils._sessionSeq++;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if (CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)){
      CliqzUtils._queryCount++;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;

    const backendPromise = fetch(url)
      .then(res => res.json())
      .then(response => {
        if(response.results && (response.results.length > 0 || !config.settings.suggestions)) {

          if (suggestionChoice === 1 && !isPrivateMode) {
            if (response.suggestions && response.suggestions.length > 0) {
              response.results = response.results.concat([{
                  url: 'https://cliqz.com/q=' + q,
                  template: 'inline-suggestion',
                  type: 'suggestion',
                  snippet: {
                    suggestions: response.suggestions.filter(r => r !== q),
                    source: 'Cliqz'
                  }
                }]);
            }
          }

          return {
            response,
            query: q
          }
        } else if (config.settings.suggestions && (suggestionChoice === 2)) {
          return CliqzUtils.getSuggestions(q);
        } else {
          return {
            response: {
              results: [],
            },
            query: q
          };
        }
      });

    if (isOldMixer && (suggestionChoice > 1) && !isPrivateMode) {
      return Promise.all([backendPromise, CliqzUtils.getSuggestions(q)]).then(values => {
        const searchResults = values[0].response.results || [];
        const googleSuggestions = values[1].response.results || [];

        return {
          query: q,
          response: {
            results: searchResults.concat(googleSuggestions)
          }
        }
      })
    }

    return backendPromise;
  },

  historySearch,

  getSuggestions: function(q) {
    const searchDataType = 'application/x-suggestions+json';
    const defaultEngine = CliqzUtils.getDefaultSearchEngine();
    const fetch = CliqzUtils.fetchFactory();
    return fetch(defaultEngine.getSubmissionForQuery(q, searchDataType))
      .then(res => res.json())
      .then(response => {
        return {
          response: {
            results: response[1].filter(r => r !== q).map(q => {
              return {
                url: defaultEngine.getSubmissionForQuery(q),
                template: 'suggestion',
                type: 'suggestion',
                snippet: { suggestion: q }
              }
            })
          },
          query: response[0]
        }
      })
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
  encodePlatform: function() {
    return '&platform=' + (isMobile ? '1' : '0');
  },
  encodeLocale: function() {
    return '&locale='+ CliqzUtils.PREFERRED_LANGUAGE || '';
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
    const suggestionsEnabled = CliqzUtils.getPref("suggestionsEnabled", false) ||
      CliqzUtils.getPref("suggestionChoice", 0) === 1;

    return `&suggest=${suggestionsEnabled ? 1 : 0}`;
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return ['T'];
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type.indexOf('cliqz-pattern') == 0) return ['C'];
    else if(type === 'cliqz-extra') return ['X'];
    else if(type === 'cliqz-series') return ['S'];
    else if(type === 'cliqz-suggestion') return ['Z'];

    else if(type.indexOf('bookmark') == 0 ||
            type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    // cliqz type = "cliqz-custom sources-X"
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type; //should never happen
  },
  //eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
  isPrivateResultType: function(type = []) {
    if (type.length === 0) {
      return false;
    }

    var onlyType = type[0].split('|')[0];
    var hasCluster = type.some(function(a){ return a.split('|')[0] === 'C'; });

    if (hasCluster) {
      // we want to be extra carefull and do not send back any cluster information
      return true;
    }

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
    // default geolocation 'yes' for funnelCake - 'ask' for everything else
    let locationPref = CliqzUtils.getPref('share_location', config.settings.geolocation || 'ask');
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
  /**
   * @deprecated - use isPrivateMode instead
   * @todo - add deprecation logging in 1.23
   */
  isPrivate: CLIQZEnvironment.isPrivate,
  /**
   * @deprecated - use isPrivateMode instead
   * @todo - add deprecation logging in 1.23
   */
  isOnPrivateTab: CLIQZEnvironment.isOnPrivateTab,
  isPrivateMode(win) {
    if (!win) {
      win = CliqzUtils.getWindow();
    }
    return CliqzUtils.isPrivate(win) || CliqzUtils.isOnPrivateTab(win);
  },
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

  /* i18n -- start */
  // TODO: all those should be remove and used from i18n directly
  get locale() {
    return i18n.locale;
  },
  get currLocale() {
    return i18n.currLocale;
  },
  get PREFERRED_LANGUAGE() {
    return i18n.PREFERRED_LANGUAGE;
  },
  get LOCALE_PATH() {
    return i18n.LOCALE_PATH;
  },
  getLanguageFromLocale: getLanguageFromLocale,
  getLocalizedString: getMessage,
  // gets all the elements with the class 'cliqz-locale' and adds
  // the localized string - key attribute - as content
  localizeDoc: function(doc){
    var locale = doc.getElementsByClassName('cliqz-locale');
    for(var i = 0; i < locale.length; i++){
        var el = locale[i];
        el.textContent = getMessage(el.getAttribute('key'));
    }
  },
  /* i18n -- end */
  /* platform -- start */
  isWindows,
  isLinux,
  isMac,
  /* platform -- end */
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
    var currentState = CliqzUtils.getPref('share_location', config.settings.geolocation || 'ask');
    if (currentState === 'showOnce') {
      currentState = 'ask';
    }

    // default geolocation 'yes' for funnelCake - 'ask' for everything else
    data[currentState].selected = true;

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
  getAllCliqzPrefs: CLIQZEnvironment.getAllCliqzPrefs,
  isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser,
  setDefaultSearchEngine: CLIQZEnvironment.setDefaultSearchEngine,
  isUnknownTemplate: CLIQZEnvironment.isUnknownTemplate,
  getEngineByName: CLIQZEnvironment.getEngineByName,
  addEngineWithDetails: CLIQZEnvironment.addEngineWithDetails,
  restoreHiddenSearchEngines: CLIQZEnvironment.restoreHiddenSearchEngines,
  removeEngine: CLIQZEnvironment.removeEngine,
  getEngineByAlias: CLIQZEnvironment.getEngineByAlias,
  getSearchEngines: CLIQZEnvironment.getSearchEngines,
  updateAlias: CLIQZEnvironment.updateAlias,
  openLink: CLIQZEnvironment.openLink,
  getCliqzPrefs() {
    function filterer(entry) {
        // avoid privay leaking prefs ('backup').
        // avoid irrelevant deep prefs (something.otherthing.x.y)
        // avoid prefs sending domains.
        // allow 'enabled' prefs
        return (( entry.indexOf('.') == -1 &&
                  entry.indexOf('backup') == -1 &&
                  entry.indexOf('attrackSourceDomainWhitelist') == -1
                )
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
