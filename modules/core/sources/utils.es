/* eslint no-param-reassign: 'off' */
/* eslint no-bitwise: 'off' */
/* eslint no-restricted-syntax: 'off' */

import CLIQZEnvironment from '../platform/environment';
import prefs from './prefs';
import Storage from './storage';
import { getPublicSuffix } from './tlds';
import { fetchFactory } from './http';
import * as searchUtils from '../core/search-engines';
import i18n from './i18n';
import historySearch from '../platform/history/search';
import inject from './kord/inject';
import random from './helpers/random';

const CliqzUtils = {
  getLogoDetails: inject.service('logos').getLogoDetails,
  environment: CLIQZEnvironment,
  RESULTS_TIMEOUT: CLIQZEnvironment.RESULTS_TIMEOUT,
  SKIN_PATH: CLIQZEnvironment.SKIN_PATH,
  BROWSER_ONBOARDING_PREF: CLIQZEnvironment.BROWSER_ONBOARDING_PREF,
  telemetryHandlers: [
    CLIQZEnvironment.telemetry
  ],

  init() {
    // cutting cyclic dependency
    CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails;
    CLIQZEnvironment.app = CliqzUtils.app;
    CliqzUtils.tldExtractor = CLIQZEnvironment.tldExtractor || getPublicSuffix;
  },
  getLocalStorage(url) {
    return new Storage(url);
  },
  openTabInWindow: CLIQZEnvironment.openTabInWindow, // TODO core/tabs -> openTab
  getDay() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  // used in testing only
  fetchFactory() {
    return fetchFactory();
  },
  historySearch,
  getSuggestions(query) {
    const defaultEngine = searchUtils.getDefaultSearchEngine();
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
      } else if (i18n.currLocale === 'de') {
        // unsupported country - fallback to
        //    'de' for german speaking users
        prefs.set('backend_country', 'de');
      } else {
        //    'us' for everybody else
        prefs.set('backend_country', 'us');
      }
    }
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
  /* TODO: move away to search module */
  _queryLastDraw: null,
  _queryCount: null,
  _sessionSeq: 0,
  _searchSession: '',
  setSearchSession() {
    const rand = random(32);
    CliqzUtils._searchSession = rand;
    CliqzUtils._sessionSeq = 0;
    CliqzUtils._queryCount = 0;
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
  /* TODO: end */

  isPrivateMode(win) {
    if (!win) {
      win = CliqzUtils.getWindow();
    }
    return CLIQZEnvironment.isPrivate(win) || CLIQZEnvironment.isOnPrivateTab(win);
  },
  telemetry(...args) {
    return Promise.all(
      CliqzUtils.telemetryHandlers.map(async (handler) => {
        try {
          await handler(...args);
        } catch (e) {
          // continue with other handlers
        }
      })
    );
  },

  getWindow: CLIQZEnvironment.getWindow,
  getWindowID: CLIQZEnvironment.getWindowID,

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
  isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser,
  updateAlias: CLIQZEnvironment.updateAlias,
  openLink: CLIQZEnvironment.openLink,
};

export default CliqzUtils;
