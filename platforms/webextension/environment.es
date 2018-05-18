/* global document */
/* eslint no-param-reassign: 'off' */

import console from '../core/console';
import prefs from '../core/prefs';
import Storage from '../core/storage';
import utils from '../core/utils';
import { promiseHttpHandler } from '../core/http';
import { isCliqzBrowser } from '../core/platform';

const eventIDs = {};
const port = chrome.runtime.connect({ name: 'encrypted-query' });
port.onMessage.addListener((response) => {
  const cb = eventIDs[response.eID].cb;
  delete eventIDs[response.eID];
  if (cb) {
    cb(response.data);
  }
});

const CLIQZEnvironment = {
  SKIN_PATH: 'modules/static/skin/',
  TEMPLATES_PATH: 'modules/static/templates/',
  RERANKERS: [],
  RESULTS_TIMEOUT: 1000, // 1 second
  TEMPLATES: {
    calculator: 1,
    clustering: 1,
    currency: 1,
    custom: 1,
    emphasis: 1,
    empty: 1,
    generic: 1,
    main: 1,
    results: 1,
    text: 1,
    series: 1,
    spellcheck: 1,
    'pattern-h1': 3,
    'pattern-h2': 2,
    'pattern-h3': 1,
    'pattern-h3-cluster': 1,
    'pattern-hm': 1,
    topsites: 3,
    CLIQZEnvironmentlebrities: 2,
    Cliqz: 2,
    'entity-generic': 2,
    noResult: 3,
    weatherAlert: 3,
    'entity-news-1': 3,
    'entity-video-1': 3,
    'flightStatusEZ-2': 2,
    weatherEZ: 2,
    news: 1,
    people: 1,
    video: 1,
    hq: 1,
    ligaEZ1Game: 2,
    ligaEZTable: 3,
    'rd-h3-w-rating': 1,
    vod: 3,
    'movie-vod': 3,
    liveTicker: 3
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
    'partials/bottom-data-sc',
    'partials/download',
    'partials/streaming',
    'partials/lyrics'
  ],
  trk: [],
  telemetry: (() => {
    let trkTimer = null;
    let telemetrySeq = -1;
    let telemetryReq = null;
    let telemetrySending = [];
    const TELEMETRY_MAX_SIZE = 500;
    function getNextSeq() {
      if (telemetrySeq === -1) {
        telemetrySeq = prefs.get('telemetrySeq', 0);
      }
      telemetrySeq = (telemetrySeq + 1) % 2147483647;
      return telemetrySeq;
    }
    function pushTelemetryCallback(req) {
      try {
        const response = JSON.parse(req.response);

        if (response.new_session) {
          prefs.set('session', response.new_session);
        }
        telemetrySending = [];
        telemetryReq = null;
      } catch (e) {
        // this can only happen if the callback is called
        // after the extension is turned off
      }
    }
    function pushTelemetryError() {
      // pushTelemetry failed, put data back in queue to be sent again later
      console.log(`push telemetry failed: ${telemetrySending.length} elements`, 'pushTelemetry');
      CLIQZEnvironment.trk = telemetrySending.concat(CLIQZEnvironment.trk);

      // Remove some old entries if too many are stored,
      // to prevent unbounded growth when problems with network.
      const slicePos = (CLIQZEnvironment.trk.length - TELEMETRY_MAX_SIZE) + 100;
      if (slicePos > 0) {
        console.log(`discarding ${slicePos}old telemetry data`, 'pushTelemetry');
        CLIQZEnvironment.trk = CLIQZEnvironment.trk.slice(slicePos);
      }

      telemetrySending = [];
      telemetryReq = null;
    }
    function pushTelemetry() {
      prefs.set('telemetrySeq', telemetrySeq);
      if (telemetryReq) return;
      // put current data aside in case of failure
      telemetrySending = CLIQZEnvironment.trk.slice(0);
      CLIQZEnvironment.trk = [];

      console.log(`push telemetry data: ${telemetrySending.length} elements`, 'pushTelemetry');

      telemetryReq = promiseHttpHandler('POST', utils.STATISTICS, JSON.stringify(telemetrySending), 10000, true);
      telemetryReq.then(pushTelemetryCallback);
      telemetryReq.catch(pushTelemetryError);
    }

    return (msg, instantPush) => {
      // no telemetry in private windows & tabs
      if (msg.type !== 'environment' && utils.isPrivateMode()) {
        return;
      }

      console.log(msg, 'Utils.telemetry');
      // telemetry in all products can be turned off using the 'telemetry' pref
      if (!prefs.get('telemetry', true)) return;

      // for the Cliqz browser we also turn off the extension telemetry
      // if the user opts-out from the browser health report
      if (isCliqzBrowser &&
        msg.type !== 'environment' && // TEMP: we only let the environment signal go though
        (prefs.get('uploadEnabled', true, 'datareporting.healthreport.') !== true)) {
        return;
      }
      // datareporting.healthreport.uploadEnabled
      msg.session = prefs.get('session');
      msg.ts = Date.now();
      msg.seq = getNextSeq();

      CLIQZEnvironment.trk.push(msg);
      CLIQZEnvironment.clearTimeout(trkTimer);
      if (instantPush || CLIQZEnvironment.trk.length % 100 === 0) {
        pushTelemetry();
      } else {
        trkTimer = CLIQZEnvironment.setTimeout(pushTelemetry, 60000);
      }
    };
  })(),
  isUnknownTemplate(template) {
    // in case an unknown template is required
    return template &&
      !CLIQZEnvironment.TEMPLATES[template];
  },
  setInterval(...args) { return setInterval(...args); },
  setTimeout(...args) { return setTimeout(...args); },
  clearTimeout(...args) { clearTimeout(...args); },
  Promise,
  OS: 'chromium',
  isPrivate() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab() { return chrome.extension.inIncognitoContext; },
  getWindow() { return { document: { getElementById() {} } }; },
  openLink(win, url/*, newTab */) {
    chrome.tabs.getCurrent(tab => chrome.tabs.update(tab.id, {
      url,
    }));
  },
  copyResult(val) {
    const backup = document.oncopy;
    try {
      document.oncopy = (event) => {
        event.clipboardData.setData('text/plain', val);
        event.preventDefault();
      };
      document.execCommand('copy', false, null);
    } finally {
      document.oncopy = backup;
    }
  },
  // debug
  _ENGINES: [{
    name: 'CLIQZ dummy search', alias: '#qq', default: true, icon: '', searchForm: 'https://www.cliqz.com/?q={searchTerms}', suggestionUrl: '', base_url: 'https://www.cliqz.com/search?q=', prefix: '#qq', code: 3
  }],
  getSearchEngines() {
    return CLIQZEnvironment._ENGINES.map((e) => {
      // TODO: create the correct search URL
      e.getSubmissionForQuery = q => e.searchForm.replace('{searchTerms}', q);

      // TODO: create the correct search URL
      e.getSuggestionUrlForQuery = q => e.suggestionUrl.replace('{searchTerms}', q);

      e.urlDetails = CLIQZEnvironment.getDetailsFromUrl(e.searchForm);

      return e;
    });
  },
  updateAlias() {},
  getEngineByAlias(alias) {
    return CLIQZEnvironment._ENGINES.find(engine => engine.alias === alias);
  },
  getEngineByName(name) {
    return CLIQZEnvironment._ENGINES.find(engine => engine.name === name);
  },
  getNoResults(q) {
    const engines = CLIQZEnvironment.getSearchEngines().map((e) => {
      e.style = CLIQZEnvironment.getLogoDetails(
        CLIQZEnvironment.getDetailsFromUrl(e.searchForm)).style;
      e.text = e.alias.sliCLIQZEnvironment(1);
      return e;
    });
    const defaultName = CLIQZEnvironment.getDefaultSearchEngine().name;
    const isUrl = utils.isUrl(q);

    return CLIQZEnvironment.Result.cliqz(
      {
        template: 'noResult',
        snippet:
          {
            text_line1: CLIQZEnvironment.getLocalizedString(isUrl ? 'noResultUrlNavigate' : 'noResultTitle'),
            // forwarding the query to the default search engine
            // is not handled by Cliqz but by Firefox
            // we should take care of this specific case differently on alternative platforms
            text_line2: isUrl ? CLIQZEnvironment.getLocalizedString('noResultUrlSearch') : CLIQZEnvironment.getLocalizedString('noResultMessage', defaultName),
            search_engines: engines,
            // use local image in case of no internet connection
            cliqz_logo: `${CLIQZEnvironment.SKIN_PATH}img/cliqz.svg`
          },
        type: 'rh',
        subType: { empty: true }
      }
    );
  },
  setDefaultSearchEngine(engine) {
    const storage = new Storage();
    storage.setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine() {
    for (const e of CLIQZEnvironment.getSearchEngines()) {
      if (e.default) {
        return e;
      }
    }
    return undefined;
  },
  setSupportInfo() {},
  restoreHiddenSearchEngines() {},
};

export default CLIQZEnvironment;
