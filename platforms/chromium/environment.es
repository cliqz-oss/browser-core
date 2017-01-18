import console from "core/console";
import prefs from "core/prefs";
import Storage from "core/storage";

let eventIDs = {};
const port = chrome.runtime.connect({name: "encrypted-query"});
port.onMessage.addListener(function(response) {
    let cb = eventIDs[response.eID].cb;
    delete eventIDs[response.eID];
    cb && cb(response.data)
});


const CLIQZEnvironment = {
  SKIN_PATH: 'modules/static/skin/',
  RESULTS_PROVIDER: 'https://newbeta.cliqz.com/api/v2/results?nrh=1&q=',
  RICH_HEADER: 'https://newbeta.cliqz.com/api/v2/rich-header?path=/v2/map',
  LOG: 'https://logging.cliqz.com',
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'modules/static/templates/',
  LOCALE_PATH: 'modules/static/locale/',
  RERANKERS: [],
  RESULTS_TIMEOUT: 1000, // 1 second
  TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
    'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
    'spellcheck': 1,
    'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
    'pattern-hm': 1,
    'topsites': 3,
    'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
    'flightStatusEZ-2': 2, 'weatherEZ': 2,
    'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
    'ligaEZ1Game': 2,
    'ligaEZTable': 3,
    'rd-h3-w-rating': 1,
    'vod': 3,
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
      'partials/bottom-data-sc',
      'partials/download',
      'partials/streaming',
      'partials/lyrics'
  ],
  trk: [],
  telemetry: (function(){
    var trkTimer = null,
        telemetrySending = [],
        TELEMETRY_MAX_SIZE = 500;

    function pushTelemetry() {
      // put current data aside in case of failure
      telemetrySending = CE.trk.slice(0);
      CE.trk = [];

      CE.httpHandler('POST', CE.LOG, pushTelemetryCallback,
          pushTelemetryError, 10000, JSON.stringify(telemetrySending));

      console.log('Telemetry', 'push telemetry data: ' + telemetrySending.length + ' elements');
    }

    function pushTelemetryCallback(req){
      var response = JSON.parse(req.response);

      if(response.new_session){
        prefs.set('session', response.new_session);
      }
      telemetrySending = [];
    }

    function pushTelemetryError(req){
      // pushTelemetry failed, put data back in queue to be sent again later
      console.log('Telemetry', 'push telemetry failed: ' + telemetrySending.length + ' elements');
      CE.trk = telemetrySending.concat(CE.trk);

      // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
      var slice_pos = CE.trk.length - TELEMETRY_MAX_SIZE + 100;
      if(slice_pos > 0){
        console.log('Telemetry', 'discarding ' + slice_pos + ' old telemetry data');
        CE.trk = CE.trk.slice(slice_pos);
      }

      telemetrySending = [];
    }

    return function(msg, instantPush) {
      if ((msg.type != 'environment') && CLIQZEnvironment.isPrivate())
        return;
      console.log('Utils.telemetry', msg);
      msg.session = prefs.get('session');
      msg.ts = Date.now();

      CE.trk.push(msg);
      CE.clearTimeout(trkTimer);

      if(instantPush || CE.trk.length % 100 == 0){
        pushTelemetry();
      } else {
        trkTimer = CE.setTimeout(pushTelemetry, 60000);
      }
    }
  })(),

  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CE.TEMPLATES[template]
  },
  getBrandsDBUrl: function(version){
    return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json';
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  OS: 'chromium',
  isPrivate: function() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab: function(win) { return CE.isPrivate(); },
  getWindow: function(){ return { document: { getElementById() {} } } },
  XMLHttpRequest: XMLHttpRequest,

  historySearch: function(q, callback, searchParam) {
    chrome.cliqzSearchPrivate.queryHistory(q, (query, matches, finished) => {
      var res = matches.map(function(match) {
          return {
              value:   match.url,
              comment: match.description,
              style:   'favicon',
              image:   '',
              label:   ''
          };
      });
      callback({
        query: query,
        results: res,
        ready: true
      });
    });
  },

  openLink: function(win, url, newTab) {
    if (newTab)
      window.open(url);
    else
      window.location.href = url;
  },

  copyResult: function(val) {
    var backup = document.oncopy;
    try {
      document.oncopy = function(event) {
        event.clipboardData.setData("text/plain", val);
        event.preventDefault();
      };
      document.execCommand("copy", false, null);
    }
    finally {
      document.oncopy = backup;
    }
  },
  // debug
  _ENGINES: [{
    "name": "CLIQZ dummy search", "alias": "#qq", "default": true, "icon": "", "searchForm": "", "suggestionUrl": "", "base_url": "https://www.cliqz.com/search?q=", "prefix": "#qq", "code": 3
  }],
  getSearchEngines: function(){
    return CE._ENGINES.map(function(e){
      e.getSubmissionForQuery = function(q){
          //TODO: create the correct search URL
          return e.searchForm.replace("{searchTerms}", q);
      }

      e.getSuggestionUrlForQuery = function(q){
          //TODO: create the correct search URL
          return e.suggestionUrl.replace("{searchTerms}", q);
      }

      return e;
    });
  },
  updateAlias: function(){},
  getEngineByAlias: function(alias) {
    return CE._ENGINES.find(engine => { return engine.alias === alias; });
  },
  getEngineByName: function(name) {
    return CE._ENGINES.find(engine => { return engine.name === name; });
  },
  getNoResults: function() {
    const engines = CE.getSearchEngines().map(e => {
      e.style = CE.getLogoDetails(
          CE.getDetailsFromUrl(e.searchForm)).style;
      e.text =  e.alias.slice(1);
      return e;
    });
    const defaultName = CE.getDefaultSearchEngine().name;

    return CE.Result.cliqz(
            {
                template:'noResult',
                snippet:
                {
                    text_line1: CE.getLocalizedString('noResultTitle'),
                    // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
                    // we should take care of this specific case differently on alternative platforms
                    text_line2: CE.getLocalizedString('noResultMessage', defaultName),
                    "search_engines": engines,
                    //use local image in case of no internet connection
                    "cliqz_logo": CE.SKIN_PATH + "img/cliqz.svg"
                },
                type: 'rh',
                subType: {empty:true}
            }
        )
  },
  setDefaultSearchEngine: function(engine) {
    const storage = new Storage();
    storage.setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    for (let e of CE.getSearchEngines()) {
      if (e.default)
        return e;
    }
  },
  onRenderComplete: function(query, urls){
    chrome.cliqzSearchPrivate.processResults(query, urls);
  },
};
const CE = CLIQZEnvironment;  // Shorthand alias.

export default CLIQZEnvironment;
