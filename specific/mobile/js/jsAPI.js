

var jsAPI = {
  init: function () {
  },
  search: function(e, location_enabled, latitude, longitude) {
    CliqzUtils.search(e, location_enabled, latitude, longitude);
  },
  getCardUrl: function() {
    var NOT_SHAREABLE_SIGNAL = '-1';
    if(CLIQZ.UI.lastResults && CLIQZ.UI.lastResults[CLIQZ.UI.currentPage]) {
      osAPI.shareCard(CLIQZ.UI.lastResults[CLIQZ.UI.currentPage].url || NOT_SHAREABLE_SIGNAL);
    } else {
      osAPI.shareCard(NOT_SHAREABLE_SIGNAL);
    }
  },
  /**
    Parameter format
    cfg = {
      "t": 123, // long, millis
      "q": "pippo", // string, last query
      "card": 1, // int, index of displayed card
      "lat": 41.00, // float, optional, latitude
      "lon": 13.00, // float, optional, longitude
      "title": "Pippo Pollina", // string, optional, webpage title
      "url": "http://pippopollina.com", // string, optional, last visited webpage
    }
  */
  resetState: function(cfg) {
    CliqzUtils.initHomepage();
    var start = document.getElementById("resetState");
    var resetStateContent = document.getElementById("resetStateContent");
    CLIQZ.UI.hideResultsBox();
    if(cfg.url && cfg.url.length > 0) {
      start.style.display = "block";
      window.document.getElementById("startingpoint").style.display = 'block';
      var elem = document.createElement('div');
      elem.setAttribute('onclick', 'osAPI.openLink("' + cfg.url + '")');
      elem.innerHTML = cfg.title;
      resetStateContent.innerHTML = "";
      resetStateContent.appendChild(elem);
    }
    else if(cfg.q && cfg.q.length > 0) {
      start.style.display = "block";
      window.document.getElementById("startingpoint").style.display = 'block';
      var location_enabled = !!cfg.lat && !!cfg.lon;
      var elem = document.createElement('div');
      elem.setAttribute('onclick', 'osAPI.notifyQuery("' + cfg.q + '", ' + location_enabled + ', ' + cfg.lat + ', ' + cfg.lon + ')');
      elem.innerHTML = cfg.q;
      resetStateContent.innerHTML = "";
      resetStateContent.appendChild(elem);
    }
  },
  setClientPreferences: function(prefs) {
    CLIQZ.UI && CLIQZ.UI.setTheme(prefs.incognito);
    for (var key in prefs) {
      if (prefs.hasOwnProperty(key)) {
        CliqzUtils.setPref(key, prefs[key]);
      }
    }
  },
  clearHistory: function() {
    History.clearHistory();
  },
  clearFavorites: function() {
    History.clearFavorites();
  },
  setDefaultSearchEngine: function(engine, url) {
    if (url) { // temporary until iOS complies
      engine = { name: engine, url: url};
    }
    CliqzUtils.setDefaultSearchEngine(engine);
    CLIQZ.UI.updateSearchCard(engine);
  },
  restoreBlockedTopSites: function () {
    CliqzUtils.getLocalStorage().setObject('blockedTopSites', []);
  },
  onShow: function () {
    if (CLIQZ.UI) { // search view
      if (!CLIQZ.UI.isSearch()) { // freshtab
        CliqzUtils.initHomepage();
      }
    } else { // history view
      History.update();
    }
  }
}
