import console from "core/console";
import prefs from "core/prefs";
import Storage from "core/storage";

//TODO: get rid of me!
var lastSucceededUrl;
var latestUrl;
const storage = new Storage();

// END TEMP
const TEMPLATES = Object.freeze(Object.assign(Object.create(null), {
  "Cliqz": true,
  "EZ-category": true,
  "EZ-history": true,
  "calculator": true,
  "celebrities": true,
  "currency": true,
  "emphasis": true,
  "empty": true,
  "entity-news-1": true,
  "flightStatusEZ-2": true,
  "generic": true,
  "history": true,
  "ligaEZ1Game": true,
  "ligaEZTable": true,
  "logo": true,
  "main": true,
  "noResult": true,
  "rd-h3-w-rating": true,
  "results": true,
  "topnews": true,
  "topsites": true,
  "url": true,
  "weatherAlert": true,
  "weatherEZ": true,
  "liveTicker": true
}));

var CLIQZEnvironment = {
  RESULTS_PROVIDER: 'https://newbeta.cliqz.com/api/v2/results?q=',
  RICH_HEADER: 'https://newbeta.cliqz.com/api/v2/rich-header?path=/v2/map',
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'mobile-ui/templates/',
  LOCALE_PATH: 'static/locale/',
  SYSTEM_BASE_URL: './',
  RESULTS_LIMIT: 3,
  MIN_QUERY_LENGHT_FOR_EZ: 0,
  RERANKERS: [],
  RESULTS_TIMEOUT: 60000, // 1 minute
  TEMPLATES: TEMPLATES,
  KNOWN_TEMPLATES: {
      'entity-generic': true,
      'entity-video-1': true,
      'vod': true
  },
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'EZ-history',
      'rd-h3-w-rating',
      'pattern-h1',
      "local-data-sc"
  ],
  GOOGLE_ENGINE: {name:'Google', url: 'http://www.google.com/search?q='},
  //TODO: check if calling the bridge for each telemetry point is expensive or not
  telemetry: function(msg) {
    msg.ts = Date.now();
    osAPI.pushTelemetry(msg);
  },
  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CLIQZEnvironment.TEMPLATES[template] &&
            !CLIQZEnvironment.KNOWN_TEMPLATES.hasOwnProperty(template);
  },
  getBrandsDBUrl: function(version){
    //TODO - consider the version !!
    return 'static/brands_database.json'
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  autoComplete: function (val,searchString) {

    if( val && val.length > 0){
      val = val.replace(/http([s]?):\/\/(www.)?/,'');
      val = val.toLowerCase();
      var urlbarValue = CLIQZEnvironment.lastSearch.toLowerCase();

      if( val.indexOf(urlbarValue) === 0 ) {
        // console.log('jsBridge autocomplete value:'+val,'osAPI1');
        osAPI.autocomplete(val);
      } else {
        var ls = storage.getObject('recentQueries', []);
        for( var i in ls ) {
          if( ls[i].query.toLowerCase().indexOf(searchString.toLowerCase()) === 0 ) {
            osAPI.autocomplete(ls[i].query.toLowerCase());
            break;
          }
        }
      }
    }
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  putHistoryFirst: function(r) {
    var history = [], backend = [];
    r._results.forEach(function (res) {
      if(res.style === 'cliqz-pattern' || res.style === 'favicon') {
        history.push(res);
      } else {
        backend.push(res);
      }
    });
    r._results = history.concat(backend);
  },
  resultsHandler: function (r) {

    if( CLIQZEnvironment.lastSearch !== r._searchString  ){
      console.log("u='"+CLIQZEnvironment.lastSearch+"'' s='"+r._searchString+"', returning","urlbar!=search");
      return;
    }
    CLIQZEnvironment.putHistoryFirst(r);

    r._results.splice(CLIQZEnvironment.RESULTS_LIMIT);

    const renderedResults = CLIQZ.UI.renderResults(r);

    renderedResults[0] && CLIQZEnvironment.autoComplete(renderedResults[0].url, r._searchString);
  },
  search: function(e) {
    if(!e || e === '') {
      // should be moved to UI except 'CLIQZEnvironment.initHomepage(true);'
      CLIQZEnvironment.lastSearch = '';
      CLIQZ.UI.hideResultsBox();
      window.document.getElementById('startingpoint').style.display = 'block';
      CLIQZEnvironment.initHomepage(true);
      CLIQZ.UI.stopProgressBar();
      CLIQZ.UI.lastResults = null;
      return;
    }

    CLIQZEnvironment.setCurrentQuery(e);

    e = e.toLowerCase().trim();

    CLIQZEnvironment.lastSearch = e;

    News.hideFreshtab();

    CLIQZ.UI.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //CliqzUtils.log(e,'XHR');
    if (!CLIQZEnvironment.SEARCH) { CLIQZEnvironment.SEARCH = new Search();}

    CLIQZEnvironment.SEARCH.search(e, CLIQZEnvironment.resultsHandler);
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  tldExtractor: function(host){
    //temp
    return host.split('.').splice(-1)[0];
  },
  OS: 'mobile',
  isPrivate: function(){ return false; },
  isOnPrivateTab: function(win) { return false; },
  getWindow: function(){ return window; },
  httpHandler: function(method, url, callback, onerror, timeout, data, sync) {
    latestUrl = url;

    function isMixerUrl(url) { return url.indexOf(CliqzUtils.RESULTS_PROVIDER) === 0; }

    var req = new XMLHttpRequest();
    req.open(method, url, !sync)
    req.overrideMimeType && req.overrideMimeType('application/json');
    req.onload = function(){
      if(!parseInt) {
        return;
      } //parseInt is not a function after extension disable/uninstall

      var statusClass = parseInt(req.status / 100);
      if(statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */){

        if(isMixerUrl(url)){
          if(typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('connected'));
          }
          lastSucceededUrl = url;
          console.log('status '+req.status, 'CLIQZEnvironment.httpHandler.onload');
        }

        callback && callback(req);
      } else {
        console.log( 'loaded with non-200 ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler.onload');
        onerror && onerror();
      }
    };
    req.onerror = function(){
      if(latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
        onerror && onerror();
        return;
      }
      if(typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of request error' }));
      }

      if(CLIQZEnvironment){
        if(isMixerUrl(url)){
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, sync);
        }
        console.log( 'error loading ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler,onerror');
        onerror && onerror();
      }
    };
    req.ontimeout = function(){

      console.log('BEFORE', 'CLIQZEnvironment.httpHandler.ontimeout');
      if(latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
        return;
      }
      if(typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of timed out request' }));
      }

      if(CLIQZEnvironment){ //might happen after disabling the extension
        if(isMixerUrl(url)){
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, sync);
        }
        console.log( 'resending: timeout for ' + url, 'CLIQZEnvironment.httpHandler.ontimeout');
        onerror && onerror();
      }
    };

    if(callback && !sync){
      if(timeout){
        req.timeout = parseInt(timeout);
      } else {
        req.timeout = (['POST', 'PUT'].indexOf(method) >= 0 ? 10000 : 1000);
      }
    }

    req.send(data);
    return req;
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  openLink: function(window, url){
    if(url !== '#')  {
      if( url.indexOf('http') === -1 ) {
        url = 'http://' + url;
      }
      osAPI.openLink(url);
    }

    return false;
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  processHistory: function(data) {
    try {
      var items = data.results;
      var res = [];
      for (var i in items) {
        var item = items[i];
        res.push({
          style:   'favicon',
          value:   item.url,
          image:   '',
          comment: (typeof(item.title) !== 'undefined' ? item.title : 'no comment'),
          label:   ''
        });
      }
      return {results: res, query:data.query, ready:true};
    } catch (e) {
      console.log('Error: ' + e, 'CLIQZEnvironment.processHistory');
    }
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  displayHistory: function(data){
    console.log(this, 'bbb');
    CLIQZEnvironment.searchHistoryCallback(CLIQZEnvironment.processHistory(data));
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  historySearch: function(q, callback){
    CLIQZEnvironment.searchHistoryCallback = callback;
    window.osAPI.searchHistory(q, 'CLIQZEnvironment.displayHistory');
  },
  //TODO: remove this dependency
  getSearchEngines: function(){
    return []
  },
  // mocked functions
  getEngineByName: function () {
    return '';
  },
  getEngineByAlias: function () {
    return '';
  },
  copyResult: function(val) {
    osAPI.copyResult(val);
  },
  addEventListenerToElements: function (elementSelector, eventType, listener) {
    Array.prototype.slice.call(document.querySelectorAll(elementSelector)).forEach(function (element) {
      element.addEventListener(eventType, listener);
    });
  },

  initHomepage: function(hideLastState) {
    if(hideLastState) {
      var start = document.getElementById('resetState');
      start && (start.style.display = 'none');
    }
    osAPI.getTopSites('News.startPageHandler', 15);
  },
  setDefaultSearchEngine: function(engine) {
    storage.setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    return storage.getObject('defaultSearchEngine', CLIQZEnvironment.GOOGLE_ENGINE);
  },
};

CLIQZEnvironment.setCurrentQuery = function(query) {

  if(prefs.get('incognito') === "true" || query.match(/http[s]{0,1}:/)) {
    return;
  }

  var recentItems = storage.getObject('recentQueries', []);

  if(!recentItems[0]) {
    recentItems = [{id: 1, query:query, timestamp:Date.now()}];
    storage.setObject('recentQueries', recentItems);
  } else if (recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60) {
    // DO NOTHING
    // temporary work around repetitive queries coming from iOS
  } else if(recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 &&
          Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = {id: recentItems[0].id, query:query, timestamp:Date.now()};
    storage.setObject('recentQueries', recentItems);
  }
  else {
    recentItems.unshift({id: recentItems[0].id + 1, query:query,timestamp:Date.now()});
    recentItems = recentItems.slice(0,60);
    storage.setObject('recentQueries', recentItems);
  }
};

export default CLIQZEnvironment;
