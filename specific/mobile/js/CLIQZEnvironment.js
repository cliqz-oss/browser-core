//TEMP
CliqzLanguage = {
  stateToQueryString: function(){ return '&lang=de,en'; }
}
XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
}

Services = {
  scriptloader: {
    loadSubScript: function(){}
  }
}

Components = {
  interfaces: {
    nsIAutoCompleteResult: {}
  },
  utils: {
    import: function(){}
  },
  ID: function(){}
}

//TODO: get rid of me!
var lastSucceededUrl;
var latestUrl;
////

// END TEMP

CLIQZEnvironment = {
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'modules/mobile-ui/templates/',
  LOCALE_PATH: 'modules/static/locale/',
  SYSTEM_BASE_URL: 'modules/',
  RESULTS_LIMIT: 3,
  MIN_QUERY_LENGHT_FOR_EZ: 0,
  storeQueryTimeout: null,
  TEMPLATES: {
        "Cliqz": true,
        "EZ-category": true,
        "EZ-history": true,
        "calculator": true,
        "celebrities": true,
        "conversations": true,
        "currency": true,
        "emphasis": true,
        "empty": true,
        "entity-news-1": true,
        "entity-search-1": true,
        "flightStatusEZ-2": true,
        "generic": true,
        "history": true,
        "ligaEZ1Game": true,
        "ligaEZTable": true,
        "ligaEZUpcomingGames": true,
        "local-cinema-sc": true,
        "local-data-sc": true,
        "local-movie-sc": true,
        "logo": true,
        "main": true,
        "noResult": true,
        "rd-h3-w-rating": true,
        "results": true,
        "stocks": true,
        "topnews": true,
        "topsites": true,
        "url": true,
        "weatherAlert": true,
        "weatherEZ": true
  },
  KNOWN_TEMPLATES: {
      'entity-portal': true,
      'entity-generic': true,
      'entity-video-1': true,
      'recipe': true,
      'ez-generic-2': true,
      'vod': true
  },
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'EZ-history',
      'rd-h3-w-rating'
  ],
  GOOGLE_ENGINE: {name:'Google', url: 'http://www.google.com/search?q='},
  log: function(msg, key){
    console.log('[[' + key + ']]', msg);
  },
  //TODO: check if calling the bridge for each telemetry point is expensive or not
  telemetry: function(msg) {
    msg.ts = Date.now();
    osAPI.pushTelemetry(msg);
  },
  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            CLIQZEnvironment.TEMPLATES.hasOwnProperty(template) == false &&
            CLIQZEnvironment.KNOWN_TEMPLATES.hasOwnProperty(template) == false;
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
        // CliqzUtils.log('jsBridge autocomplete value:'+val,'osAPI1');
        osAPI.autocomplete(val);
      } else {
        var ls = JSON.parse(CLIQZEnvironment.getLocalStorage().recentQueries || '[]');
        for( var i in ls ) {
          if( ls[i].query.toLowerCase().indexOf(searchString.toLowerCase()) === 0 ) {
            osAPI.autocomplete(ls[i].query.toLowerCase());
            break;
          }
        }
      }
    }
  },
  renderResults: function(r) {
    var renderedResults = CLIQZ.UI.results(r);

    CLIQZ.UI.stopProgressBar();

    return renderedResults;
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  putHistoryFirst: function(r) {
    for(var i = 0; i < r._results.length; i++) {
      if(r._results[i].style === 'cliqz-pattern' || r._results[i].style === 'favicon') {
        r._results.unshift(r._results.splice(i, 1)[0]);
        return 1;
      }
    }
    return 0;
  },
  resultsHandler: function (r) {

    if( CLIQZEnvironment.lastSearch !== r._searchString  ){
      CliqzUtils.log("u='"+CLIQZEnvironment.lastSearch+"'' s='"+r._searchString+"', returning","urlbar!=search");
      return;
    }

    var historyCount = CLIQZEnvironment.putHistoryFirst(r);

    r._results.splice(CLIQZEnvironment.RESULTS_LIMIT + historyCount);

    renderedResults = CLIQZEnvironment.renderResults(r, historyCount);

    CLIQZEnvironment.lastResults = renderedResults.results;

    if(renderedResults.results.length > historyCount) {
      CLIQZEnvironment.autoComplete(renderedResults.results[historyCount].val,r._searchString);
    }
  },
  search: function(e, location_enabled, latitude, longitude) {
    if(!e || e === '') {
      CLIQZEnvironment.lastSearch = '';
      CLIQZ.UI.hideResultsBox();
      window.document.getElementById('startingpoint').style.display = 'block';
      CLIQZEnvironment.initHomepage(true);
      CLIQZ.UI.stopProgressBar();
      CLIQZEnvironment.lastResults = null;
      return;
    }

    CLIQZEnvironment.setCurrentQuery(e);

    e = e.toLowerCase().trim();

    CLIQZEnvironment.lastSearch = e;
    CLIQZEnvironment.location_enabled = location_enabled;
    if(location_enabled) {
      CLIQZEnvironment.USER_LAT = latitude;
      CLIQZEnvironment.USER_LNG = longitude;
    } else {
      delete CLIQZEnvironment.USER_LAT;
      delete CLIQZEnvironment.USER_LNG;
    }

    window.document.getElementById('startingpoint').style.display = 'none';

    CLIQZ.UI.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //CliqzUtils.log(e,'XHR');
    (new CliqzAutocomplete.CliqzResults()).search(e, CLIQZEnvironment.resultsHandler);
  },
  getPref: function(pref, notFound){
    var mypref;
    if(mypref = CLIQZEnvironment.getLocalStorage().getItem(pref)) {
      return mypref;
    } else {
      return notFound;
    }
  },
  setPref: function(pref, val){
    //CliqzUtils.log('setPrefs',arguments);
    CLIQZEnvironment.getLocalStorage().setItem(pref,val);
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  tldExtractor: function(host){
    //temp
    return host.split('.').splice(-1)[0];
  },
  getLocalStorage: function(url) {
    return CLIQZ.CliqzStorage;
  },
  OS: 'mobile',
  isPrivate: function(){ return false; },
  isScrolling: false,
  getWindow: function(){ return window; },
  getDomNodeContent: function(el) {
    return el.outerHTML;
  },
  httpHandler: function(method, url, callback, onerror, timeout, data, asynchronous) {
    latestUrl = url;

    function isMixerUrl(url) { return url.indexOf(CliqzUtils.RESULTS_PROVIDER) === 0; }

    var req = new XMLHttpRequest();
    if (asynchronous === undefined) {
      req.open(method, url, true);
    } else {
      req.open(method, url, asynchronous);
    }
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
          CliqzUtils.log('status '+req.status, 'CLIQZEnvironment.httpHandler.onload');
        }

        callback && callback(req);
      } else {
        CliqzUtils.log( 'loaded with non-200 ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler.onload');
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
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, asynchronous);
        }
        CliqzUtils.log( 'error loading ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler,onerror');
        onerror && onerror();
      }
    };
    req.ontimeout = function(){

      CliqzUtils.log('BEFORE', 'CLIQZEnvironment.httpHandler.ontimeout');
      if(latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
        return;
      }
      if(typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of timed out request' }));
      }

      if(CLIQZEnvironment){ //might happen after disabling the extension
        if(isMixerUrl(url)){
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, asynchronous);
        }
        CliqzUtils.log( 'resending: timeout for ' + url, 'CLIQZEnvironment.httpHandler.ontimeout');
        onerror && onerror();
      }
    };

    if(callback){
      if(timeout){
        req.timeout = parseInt(timeout);
      } else {
        req.timeout = (method === 'POST'? 10000 : 1000);
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
      CliqzUtils.log('Error: ' + e, 'CLIQZEnvironment.processHistory');
    }
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  displayHistory: function(data){
    this.searchHistoryCallback(CLIQZEnvironment.processHistory(data));
  },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  historySearch: function(q, callback){
    this.searchHistoryCallback = callback;
    window.osAPI.searchHistory(q, 'CLIQZEnvironment.displayHistory');
  },
  //TODO: remove this dependency
  getSearchEngines: function(){
    return []
  },
  //TODO: move this out to CLIQZ utils
  distance: function(lon1, lat1, lon2, lat2) {
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
  getNoResults: function() {
    var engine = CLIQZEnvironment.getDefaultSearchEngine();
    var details = CliqzUtils.getDetailsFromUrl(engine.url);
    var logo = CliqzUtils.getLogoDetails(details);

    var result =  Result.cliqzExtra(
      {
        data:
          {
            template:'noResult',
            title: CliqzUtils.getLocalizedString('mobile_no_result_title'),
            action: CliqzUtils.getLocalizedString('mobile_no_result_action', engine.name),
            searchString: encodeURIComponent(CLIQZEnvironment.lastSearch),
            searchEngineUrl: engine.url,
            logo: logo
          },
        subType: JSON.stringify({empty:true})
      }
    );
    result.data.kind = ['CL'];
    return result;
  },
  setDefaultSearchEngine: function(engine) {
    CLIQZEnvironment.getLocalStorage().setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    return CLIQZEnvironment.getLocalStorage().getObject('defaultSearchEngine') || CLIQZEnvironment.GOOGLE_ENGINE;
  },
};

CLIQZEnvironment.setCurrentQuery = function(query) {

  if(CLIQZEnvironment.getPref('incognito') === "true" || query.match(/http[s]{0,1}:/)) {
    return;
  }

  var recentItems = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);

  if(!recentItems[0]) {
    recentItems = [{id: 1, query:query, timestamp:Date.now()}];
    CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
  } else if (recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60) {
    // DO NOTHING
    // temporary work around repetitive queries coming from iOS
  } else if(recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 &&
          Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = {id: recentItems[0].id, query:query, timestamp:Date.now()};
    CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
  }
  else {
    recentItems.unshift({id: recentItems[0].id + 1, query:query,timestamp:Date.now()});
    recentItems = recentItems.slice(0,60);
    CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
  }
};

