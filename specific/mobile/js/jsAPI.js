var UI;

var jsAPI = {
  init: function () {
    UI = System.get("mobile-ui/UI").default;
  },
  search: function(e, location_enabled, latitude, longitude) {
    CliqzUtils.search(e, location_enabled, latitude, longitude);
  },
  getCardUrl: function() {
    var NOT_SHAREABLE_SIGNAL = '-1';
    if(UI.lastResults && UI.lastResults[UI.currentPage]) {
      osAPI.shareCard(UI.lastResults[UI.currentPage].url || NOT_SHAREABLE_SIGNAL);
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
    UI.hideResultsBox();
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
  setDefaultSearchEngine: function(engine) {
    CliqzUtils.setDefaultSearchEngine(engine);
    UI.updateSearchCard(engine);
  },
  restoreBlockedTopSites: function () {
    CliqzUtils.getLocalStorage().setObject('blockedTopSites', []);
  },
  onShow: function () {
    if (UI) { // search view
      if (!UI.isSearch()) { // freshtab
        CliqzUtils.initHomepage();
      }
    } else { // history view
      History.init();
    }
  }
}
