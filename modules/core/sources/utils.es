/* eslint no-param-reassign: 'off' */
/* eslint no-bitwise: 'off' */
/* eslint no-restricted-syntax: 'off' */

import config from '../core/config';
import CLIQZEnvironment from '../platform/environment';
import console from './console';
import prefs from './prefs';
import Storage from './storage';
import { getPublicSuffix } from './tlds';
import { httpHandler, promiseHttpHandler } from './http';
import CliqzLanguage from './language';
import * as _url from './url';
import random from './crypto/random';
import { fetchFactory } from '../platform/fetch';
import { isWindows, isLinux, isMac, isMobile, isOnionMode } from './platform';
import i18n, { getMessage, getLanguageFromLocale } from './i18n';
import historySearch from '../platform/history/search';

const VERTICAL_ENCODINGS = {
  people: 'p',
  news: 'n',
  video: 'v',
  hq: 'h',
  bm: 'm',
  reciperd: 'r',
  game: 'g',
  movie: 'o'
};

let BRANDS_DATABASE = { domains: Object.create(null), palette: ['999'] };

const CliqzUtils = {
  environment: CLIQZEnvironment,
  RESULTS_PROVIDER: config.settings.RESULTS_PROVIDER,
  RICH_HEADER: config.settings.RICH_HEADER,
  RESULTS_PROVIDER_LOG: config.settings.RESULTS_PROVIDER_LOG,
  RESULTS_PROVIDER_PING: config.settings.RESULTS_PROVIDER_PING,
  STATISTICS: config.settings.STATISTICS,
  SAFE_BROWSING: config.settings.SAFE_BROWSING,
  TUTORIAL_URL: config.settings.TUTORIAL_URL,
  UNINSTALL: config.settings.UNINSTALL,
  FEEDBACK: config.settings.FEEDBACK,
  get FEEDBACK_URL() {
    return `${this.FEEDBACK}${this.VERSION}-${config.settings.channel}`;
  },
  RESULTS_TIMEOUT: CLIQZEnvironment.RESULTS_TIMEOUT,

  BRANDS_DATABASE,

  // will be updated from the mixer config endpoint every time new logos are generated
  BRANDS_DATABASE_VERSION: 1521469421408,
  // The ID of the geolocation watcher
  // (function that updates cached geolocation on change)
  GEOLOC_WATCH_ID: null,

  VERTICAL_TEMPLATES: {
    n: 'news',
    p: 'people',
    v: 'video',
    h: 'hq',
    r: 'recipe',
    g: 'cpgame_movie',
    o: 'cpgame_movie'
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
    // cutting cyclic dependency
    CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails.bind(CliqzUtils);
    CLIQZEnvironment.getDetailsFromUrl = CliqzUtils.getDetailsFromUrl.bind(CliqzUtils);
    CLIQZEnvironment.getLocalizedString = CliqzUtils.getLocalizedString.bind(CliqzUtils);
    CLIQZEnvironment.app = CliqzUtils.app;
    CliqzUtils.log('Initialized', 'CliqzUtils');

    CliqzUtils.tldExtractor = CLIQZEnvironment.tldExtractor || CliqzUtils.genericTldExtractor;
  },
  setLogoDb(db) {
    const domains = Object.create(null);
    db.domains = Object.assign(domains, db.domains);
    BRANDS_DATABASE = db;
    CliqzUtils.BRANDS_DATABASE = BRANDS_DATABASE;
  },
  getLogoDetails(urlDetails) {
    const base = urlDetails.name;
    const baseCore = base.replace(/[-]/g, '');
    const check = (host, rule) => {
      const address = host.lastIndexOf(base);
      const parseddomain = `${host.substr(0, address)}$${host.substr(address + base.length)}`;
      return parseddomain.indexOf(rule) !== -1;
    };
    let result = {};
    const domains = BRANDS_DATABASE.domains;
    const blackTxtColor = '2d2d2d';

    if (base.length === 0) {
      return result;
    }

    if (base === 'IP') {
      result = { text: 'IP', backgroundColor: '9077e3' };
    } else if (domains[base]) {
      for (let i = 0, imax = domains[base].length; i < imax; i += 1) {
        // r = rule, b = background-color, l = logo, t = text, c = color
        const rule = domains[base][i];

        if (check(urlDetails.host, rule.r)) {
          result = {
            backgroundColor: rule.b ? rule.b : null,
            backgroundImage: rule.l
              ? `url(${config.settings.BACKGROUND_IMAGE_URL}${this.BRANDS_DATABASE_VERSION}/logos/${base}/${rule.r}.svg)`
              : '',
            text: rule.t,
            color: rule.c ? '' : '#fff',
            brandTxtColor: rule.b ? rule.b : blackTxtColor,
          };
          break;
        }
      }
    }
    result.text = result.text || `${baseCore[0] || ''}${baseCore[1] || ''}`.toLowerCase();
    result.backgroundColor = result.backgroundColor
      || BRANDS_DATABASE.palette[base.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % BRANDS_DATABASE.palette.length];
    result.brandTxtColor = result.brandTxtColor || blackTxtColor;

    const colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor);
    const buttonClass = BRANDS_DATABASE.buttons
      && colorID !== -1
      && BRANDS_DATABASE.buttons[colorID]
      ? BRANDS_DATABASE.buttons[colorID]
      : 10;

    result.buttonsClass = `cliqz-brands-button-${buttonClass}`;
    result.style = `background-color: #${result.backgroundColor};color:${(result.color || '#fff')};`;


    if (result.backgroundImage) {
      result.style += `background-image:${result.backgroundImage}; text-indent: -10em;`;
    }

    return result;
  },
  httpHandler(...args) {
    const errorHandler = args[3]; // see httpGet or httpPost arguments
    try {
      return httpHandler.call(undefined, ...args);
    } catch (e) {
      if (errorHandler) {
        errorHandler(e);
      } else {
        CliqzUtils.log(e, 'httpHandler failed');
      }
    }
    return undefined;
  },
  httpGet(url, callback, onerror, timeout, _, sync) {
    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout, _, sync);
  },
  httpPost(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
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
  loadResource(url, callback, onerror) {
    try {
      return CliqzUtils.httpGet(url, callback, onerror, 3000);
    } catch (e) {
      CliqzUtils.log(`Could not load resource ${url} from the xpi`,
        'CliqzUtils.httpHandler');
      if (onerror) {
        onerror();
      }
    }
    return undefined;
  },
  openTabInWindow: CLIQZEnvironment.openTabInWindow,
  getPref: prefs.get,
  setPref: prefs.set,
  hasPref: prefs.has,
  clearPref: prefs.clear,
  log(msg, key) {
    console.log(key, msg);
  },
  getDay() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  getServerDay() {
    const serverDateStr = CliqzUtils.getPref('config_ts', null);
    if (serverDateStr) {
      try {
        const year = serverDateStr.substr(0, 4);
        const month = serverDateStr.substr(4, 2);
        const day = serverDateStr.substr(6, 2);
        const realDate = new Date(`${year}/${month}/${day}`);

        // we need to consider the timezone offset
        return Math.floor(
          (realDate.getTime() - (realDate.getTimezoneOffset() * 60 * 1000)) / 86400000
        );
      } catch (e) {
        // fallback to getDay
      }
    }

    return CliqzUtils.getDay();
  },
  // creates a random 'len' long string from the input space
  rand(len, _space) {
    let ret = '';
    let i;
    const space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const sLen = space.length;

    for (i = 0; i < len; i += 1) {
      ret += space.charAt(Math.floor(random() * sLen));
    }

    return ret;
  },
  hash(s) {
    return s.split('').reduce((a, b) => (((a << 4) - a) + b.charCodeAt(0)) & 0xEFFFFFF, 0);
  },
  cleanMozillaActions: _url.cleanMozillaActions,
  cleanUrlProtocol(url, cleanWWW) {
    if (!url) {
      return '';
    }

    // removes protocol if it's http(s). See CLIQZIUM-218.
    const urlLowered = url.toLowerCase();
    if (urlLowered.startsWith('http://')) {
      url = url.slice(7);
    }
    if (urlLowered.startsWith('https://')) {
      url = url.slice(8);
    }

    // removes the www.
    if (cleanWWW && url.toLowerCase().startsWith('www.')) {
      url = url.slice(4);
    }

    return url;
  },
  genericTldExtractor: getPublicSuffix,
  getDetailsFromUrl: _url.getDetailsFromUrl,
  stripTrailingSlash: _url.stripTrailingSlash,
  isUrl: _url.isUrl,
  // Remove clutter (http, www) from urls
  generalizeUrl(url, skipCorrection) {
    if (!url) {
      return '';
    }
    let val = url.toLowerCase();
    const cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/');
    const host = cleanParts[0];
    let pathLength = 0;
    const SYMBOLS = /,|\./g;
    if (!skipCorrection) {
      if (cleanParts.length > 1) {
        pathLength = (`/${cleanParts.slice(1).join('/')}`).length;
      }
      if (host.indexOf('www') === 0 && host.length > 4) {
        // only fix symbols in host
        if (SYMBOLS.test(host[3]) && host[4] !== ' ') {
        // replace only issues in the host name, not ever in the path
          val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
          (pathLength ? val.substr(-pathLength) : '');
        }
      }
    }
    url = CliqzUtils.cleanUrlProtocol(val, true);
    return url[url.length - 1] === '/' ? url.slice(0, -1) : url;
  },
  // Remove clutter from urls that prevents pattern detection, e.g. checksum
  simplifyUrl(url) {
    let q;
    // Google redirect urls
    if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
      // Return target URL instead
      url = url.substring(url.lastIndexOf('url=')).split('&')[0];
      url = url.substr(4);
      return decodeURIComponent(url);

      // Remove clutter from Google searches
    } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.lastIndexOf('q=')).split('&')[0];
      if (q !== 'q=') {
        // tbm defines category (images/news/...)
        const param = url.indexOf('#') !== -1 ? url.substr(url.indexOf('#')) : url.substr(url.indexOf('?'));
        const tbm = param.indexOf('tbm=') !== -1 ? (`&${param.substring(param.lastIndexOf('tbm=')).split('&')[0]}`) : '';
        return `https://www.google.com/search?${q}${tbm}`;
      }
      return url;
      // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.indexOf('q=')).split('&')[0];
      if (q !== 'q=') {
        if (url.indexOf('search?') !== -1) {
          return `${url.substr(0, url.indexOf('search?'))}search?${q}`;
        }
        return `${url.substr(0, url.indexOf('/?'))}/?${q}`;
      }
      return url;
      // Yahoo redirect
    } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
      url = url.substring(url.lastIndexOf('/RU=')).split('/RK=')[0];
      url = url.substr(4);
      return decodeURIComponent(url);
      // Yahoo
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      const p = url.substring(url.indexOf('p=')).split('&')[0];
      if (p !== 'p=' && url.indexOf(';') !== -1) {
        return `${url.substr(0, url.indexOf(';'))}?${p}`;
      }
      return url;
    }
    return url;
  },

  // establishes the connection
  pingCliqzResults() {
    CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
  },

  getResultsProviderQueryString(q, { resultOrder }) {
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
           CliqzUtils.encodeResultOrder(resultOrder) +
           CliqzUtils.encodeCountry() +
           CliqzUtils.encodeFilter() +
           CliqzUtils.encodeLocation(true) + // @TODO: remove true
           CliqzUtils.encodeResultCount(numberResults) +
           CliqzUtils.enncodeQuerySuggestionParam() +
           CliqzUtils.disableWikiDedup();
  },

  getRichHeaderQueryString(q, loc) {
    // @TODO: should start with &q=
    // eslint-disable-next-line prefer-template
    return '&q=' + encodeURIComponent(q) +
            CliqzUtils.encodeSessionParams() +
            CliqzLanguage.stateToQueryString() +
            CliqzUtils.encodeLocale() +
            CliqzUtils.encodePlatform() +
            CliqzUtils.encodeResultOrder() +
            CliqzUtils.encodeCountry() +
            CliqzUtils.encodeFilter() +
            CliqzUtils.encodeLocation(true, loc && loc.latitude, loc && loc.longitude) +
            CliqzUtils.disableWikiDedup();
  },
  // used in testing only
  fetchFactory() {
    return fetchFactory();
  },

  getBackendResults(q, params = {}) {
    if (isOnionMode) {
      return Promise.resolve({
        response: {
          results: [],
          offers: [],
        },
        query: q
      });
    }

    const url = CliqzUtils.RESULTS_PROVIDER + CliqzUtils.getResultsProviderQueryString(q, params);
    const fetch = CliqzUtils.fetchFactory();

    CliqzUtils._sessionSeq += 1;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if (CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)) {
      CliqzUtils._queryCount += 1;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;
    const privacyOptions = {
      credentials: 'omit',
      cache: 'no-store',
    };

    const backendPromise = fetch(url, privacyOptions)
      .then(res => res.json())
      .then((response) => {
        if (prefs.get('myoffrz.experiments.001.position', 'first') === 'last') {
          const offerResults = response.results.filter(r => r.template === 'offer');
          const nonOfferResults = response.results.filter(r => r.template !== 'offer');

          response.results = [
            ...nonOfferResults,
            ...offerResults,
          ];
        }
        if ((response.results && (response.results.length > 0 || !config.settings.suggestions))
          || (response.offers && response.offers.length > 0)) {
          return {
            response,
            query: q
          };
        }

        return {
          response: {
            results: [],
            offers: [],
          },
          query: q
        };
      });


    return backendPromise;
  },

  historySearch,

  getSuggestions(query) {
    const defaultEngine = CliqzUtils.getDefaultSearchEngine();
    const url = defaultEngine.getSubmissionForQuery(query, 'application/x-suggestions+json');
    const fetch = CliqzUtils.fetchFactory();
    if (url) {
      return fetch(url, { credentials: 'omit', cache: 'no-store' }).then(res => res.json());
    }
    return Promise.resolve([query, []]);
  },
  setDefaultCountryIndex() {
    const selectedCountry = prefs.get('backend_country', '');
    const supportedCountries = JSON.parse(prefs.get('config_backends', '["de"]'));
    const unsupportedCountrySelection = supportedCountries.indexOf(selectedCountry) === -1;

    // we only set the prefered backend once at first start
    // or we reset if it's unsupported
    if (selectedCountry === '' || unsupportedCountrySelection) {
      const location = prefs.get('config_location', 'de');
      if (supportedCountries.indexOf(location) !== -1) {
        // supported country
        prefs.set('backend_country', location);
      } else if (CliqzUtils.currLocale === 'de') {
        // unsupported country - fallback to
        //    'de' for german speaking users
        prefs.set('backend_country', 'de');
      } else {
        //    'us' for everybody else
        prefs.set('backend_country', 'us');
      }
    }
  },
  // this is called from the UI. In that case we clear the override
  setCountryIndex(country) {
    prefs.clear('backend_country.override');
    prefs.set('backend_country', country);
  },
  encodePlatform() {
    return `&platform=${(isMobile ? '1' : '0')}`;
  },
  encodeLocale() {
    return `&locale=${CliqzUtils.PLATFORM_LOCALE || ''}`;
  },
  encodeCountry() {
    return `&country=${prefs.get('backend_country.override', prefs.get('backend_country', 'de'))}`;
  },
  disableWikiDedup() {
    // disable wikipedia deduplication on the backend side
    const doDedup = CliqzUtils.getPref('languageDedup', false);
    if (doDedup) return '&ddl=0';
    return '';
  },
  getAdultContentFilterState() {
    const data = {
      conservative: 3,
      moderate: 0,
      liberal: 1
    };
    const pref = CliqzUtils.getPref('adultContentFilter', 'moderate');
    return data[pref];
  },
  encodeFilter() {
    return `&adult=${CliqzUtils.getAdultContentFilterState()}`;
  },
  encodeResultCount(count) {
    count = count || 5;
    return `&count=${count}`;
  },
  enncodeQuerySuggestionParam() {
    const suggestionsEnabled = CliqzUtils.getPref('suggestionsEnabled', false) ||
      CliqzUtils.getPref('suggestionChoice', 0) === 1;

    return `&suggest=${suggestionsEnabled ? 1 : 0}`;
  },
  encodeResultType(type) {
    if (type.indexOf('action') !== -1) return ['T'];
    else if (type.indexOf('cliqz-results') === 0) return CliqzUtils.encodeCliqzResultType(type);
    else if (type.indexOf('cliqz-pattern') === 0) return ['C'];
    else if (type === 'cliqz-extra') return ['X'];
    else if (type === 'cliqz-series') return ['S'];
    else if (type === 'cliqz-suggestion') return ['Z'];

    else if (type.indexOf('bookmark') === 0 ||
            type.indexOf('tag') === 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if (type.indexOf('favicon') === 0 ||
            type.indexOf('history') === 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    // cliqz type = "cliqz-custom sources-X"
    else if (type.indexOf('cliqz-custom') === 0) return type.substr(21);

    return type; // should never happen
  },
  // eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
  isPrivateResultType(type = []) {
    if (type.length === 0) {
      return false;
    }

    const onlyType = type[0].split('|')[0];
    const hasCluster = type.some(a => a.split('|')[0] === 'C');

    if (hasCluster) {
      // we want to be extra carefull and do not send back any cluster information
      return true;
    }

    return 'HBTCS'.indexOf(onlyType) !== -1 && type.length === 1;
  },
  // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
  encodeCliqzResultType(type) {
    const pos = type.indexOf('sources-');
    if (pos !== -1) {
      return CliqzUtils.encodeSources(type.substr(pos + 8));
    }
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
  setSearchSession(rand) {
    CliqzUtils._searchSession = rand;
    CliqzUtils._sessionSeq = 0;
    CliqzUtils._queryCount = 0;
    CliqzUtils._queryLastLength = 0;
    CliqzUtils._queryLastDraw = 0;
  },
  encodeSessionParams() {
    if (CliqzUtils._searchSession.length) {
      // eslint-disable-next-line prefer-template
      return '&s=' + encodeURIComponent(CliqzUtils._searchSession) +
             '&n=' + CliqzUtils._sessionSeq +
             '&qc=' + CliqzUtils._queryCount;
    }
    return '';
  },

  encodeLocation(specifySource, lat, lng) {
    // default geolocation 'yes' for funnelCake - 'ask' for everything else
    let locationPref = CliqzUtils.getPref('share_location', config.settings.geolocation || 'ask');
    if (locationPref === 'showOnce') {
      locationPref = 'ask';
    }
    let qs = `&loc_pref=${locationPref}`;

    if ((CliqzUtils.USER_LAT && CliqzUtils.USER_LNG) || (lat && lng)) {
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
  encodeSources(sources) {
    return sources.toLowerCase().split(', ').map(
      (s) => {
        if (s.indexOf('cache') === 0) { // to catch 'cache-*' for specific countries
          return 'd';
        }
        return VERTICAL_ENCODINGS[s] || s;
      });
  },
  isPrivateMode(win) {
    if (!win) {
      win = CliqzUtils.getWindow();
    }
    return CLIQZEnvironment.isPrivate(win) || CLIQZEnvironment.isOnPrivateTab(win);
  },
  telemetry(...args) {
    return Promise.all(CliqzUtils.telemetryHandlers.map(handler => handler(...args)));
  },
  sendUserFeedback(data) {
    data._type = 'user_feedback';
    // Params: method, url, resolve, reject, timeout, data
    httpHandler('POST', CliqzUtils.STATISTICS, null, null, 10000, JSON.stringify(data));
  },
  encodeResultOrder(resultOrder) {
    return `&o=${encodeURIComponent(JSON.stringify(resultOrder))}`;
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
  get PLATFORM_LOCALE() {
    return i18n.PLATFORM_LOCALE; // eg: en-US, en-GB, de
  },
  get PLATFORM_LANGUAGE() {
    return i18n.PLATFORM_LANGUAGE; // eg: en, de, es
  },
  get LOCALE_PATH() {
    return i18n.LOCALE_PATH;
  },
  getLanguageFromLocale,
  getLocalizedString: getMessage,
  // gets all the elements with the class 'cliqz-locale' and adds
  // the localized string - key attribute - as content
  localizeDoc(doc) {
    const locale = doc.getElementsByClassName('cliqz-locale');
    for (let i = 0; i < locale.length; i += 1) {
      const el = locale[i];
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
  bindObjectFunctions(from, to) {
    for (const funcName in from) {
      if (Object.prototype.hasOwnProperty.call(from, funcName)) {
        const func = from[funcName];
        // Can't compare with prototype of object from a different module.
        if (typeof func === 'function') {
          from[funcName] = func.bind(to);
        }
      }
    }
  },
  tryDecodeURIComponent: _url.tryDecodeURIComponent,
  tryDecodeURI: _url.tryDecodeURI,
  tryEncodeURIComponent: _url.tryEncodeURIComponent,
  tryEncodeURI: _url.tryEncodeURI,
  parseQueryString(qstr) {
    const query = {};
    const a = (qstr || '').split('&');
    for (const i in a) {
      if (Object.prototype.hasOwnProperty.call(a, i)) {
        const b = a[i].split('=');
        query[CliqzUtils.tryDecodeURIComponent(b[0])] = CliqzUtils.tryDecodeURIComponent(b[1]);
      }
    }

    return query;
  },
  roundToDecimal(number, digits) {
    const multiplier = 10 ** digits;
    return Math.round(number * multiplier) / multiplier;
  },
  getAdultFilterState() {
    const data = {
      conservative: {
        name: CliqzUtils.getLocalizedString('always'),
        selected: false
      },
      moderate: {
        name: CliqzUtils.getLocalizedString('always_ask'),
        selected: false
      },
      liberal: {
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
  getLocationPermState() {
    const data = {
      yes: {
        name: CliqzUtils.getLocalizedString('always'),
        selected: false
      },
      ask: {
        name: CliqzUtils.getLocalizedString('always_ask'),
        selected: false
      },
      no: {
        name: CliqzUtils.getLocalizedString('never'),
        selected: false
      }
    };
    let currentState = CliqzUtils.getPref('share_location', config.settings.geolocation || 'ask');
    if (currentState === 'showOnce') {
      currentState = 'ask';
    }

    // default geolocation 'yes' for funnelCake - 'ask' for everything else
    data[currentState].selected = true;

    return data;
  },
  getNoResults: CLIQZEnvironment.getNoResults,
  search: CLIQZEnvironment.search,
  distance(lon1, lat1, lon2 = CliqzUtils.USER_LNG, lat2 = CliqzUtils.USER_LAT) {
    /** Converts numeric degrees to radians */
    function degreesToRad(degree) {
      return (degree * Math.PI) / 180;
    }

    const R = 6371; // Radius of the earth in km
    if (!lon2 || !lon1 || !lat2 || !lat1) { return -1; }
    const dLat = degreesToRad(lat2 - lat1); // Javascript functions in radians
    const dLon = degreesToRad(lon2 - lon1);
    const a = (Math.sin(dLat / 2) * Math.sin(dLat / 2)) +
            (Math.cos(degreesToRad(lat1)) * Math.cos(degreesToRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
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
      return ((
        entry.indexOf('.') === -1 &&
        entry.indexOf('backup') === -1 &&
        entry.indexOf('attrackSourceDomainWhitelist') === -1
      )
        || entry.indexOf('.enabled') !== -1);
    }

    const cliqzPrefs = {};
    const cliqzPrefsKeys = CliqzUtils.getAllCliqzPrefs().filter(filterer);

    for (let i = 0; i < cliqzPrefsKeys.length; i += 1) {
      cliqzPrefs[cliqzPrefsKeys[i]] = prefs.get(cliqzPrefsKeys[i]);
    }

    return cliqzPrefs;
  },
  promiseHttpHandler,
  fetchAndStoreConfig() { return Promise.resolve(); },
};

export default CliqzUtils;
