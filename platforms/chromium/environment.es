import console from "../core/console";
import config from '../core/config';
import prefs from "../core/prefs";
import Storage from "../core/storage";
import CliqzUtils from "../core/utils"

let eventIDs = {};
const port = chrome.runtime.connect({name: "encrypted-query"});
port.onMessage.addListener(function(response) {
    let cb = eventIDs[response.eID].cb;
    delete eventIDs[response.eID];
    cb && cb(response.data)
});


const CLIQZEnvironment = {
  SKIN_PATH: 'modules/static/skin/',
  RESULTS_PROVIDER: 'https://api.cliqz.com/api/v2/results?nrh=1&q=',
  RICH_HEADER: 'https://api.cliqz.com/api/v2/rich-header?path=/v2/map',
  LOG: 'https://stats.cliqz.com',
  TEMPLATES_PATH: 'modules/static/templates/',
  LOCALE_PATH: config.baseURL+'static/locale/',
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
    'movie-vod': 3,
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
  telemetry: function () {},

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
  openLink: function(win, url, newTab) {
    chrome.cliqzSearchPrivate.navigate(url, !!newTab);
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
    "name": "CLIQZ dummy search", "alias": "#qq", "default": true, "icon": "", "searchForm": "https://www.cliqz.com/?q={searchTerms}", "suggestionUrl": "", "base_url": "https://www.cliqz.com/search?q=", "prefix": "#qq", "code": 3
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
  getNoResults: function(q) {
    const engines = CE.getSearchEngines().map(e => {
      e.style = CE.getLogoDetails(
          CE.getDetailsFromUrl(e.searchForm)).style;
      e.text =  e.alias.slice(1);
      return e;
    });
    const defaultName = CE.getDefaultSearchEngine().name,
          isUrl = CliqzUtils.isUrl(q);

    return CE.Result.cliqz(
            {
                template:'noResult',
                snippet:
                {
                    text_line1: CE.getLocalizedString(isUrl ? 'noResultUrlNavigate' : 'noResultTitle'),
                    // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
                    // we should take care of this specific case differently on alternative platforms
                    text_line2: isUrl ? CE.getLocalizedString('noResultUrlSearch') : CE.getLocalizedString('noResultMessage', defaultName),
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
  onRenderComplete: function(query, allUrls) {
    chrome.cliqzSearchPrivate.processResults(query, allUrls);
  },
  onResultSelectionChange: function(position) {
    chrome.cliqzSearchPrivate.onResultSelectionChange(position);
  },
  setSupportInfo() {},
};
const CE = CLIQZEnvironment;  // Shorthand alias.

export default CLIQZEnvironment;
