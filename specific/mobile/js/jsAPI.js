

var jsAPI = {
  init: function () {
  },
  search: function(e, location_enabled, latitude, longitude) {
    if (location_enabled) {
      CliqzUtils.USER_LAT = latitude;
      CliqzUtils.USER_LNG = longitude;
    } else {
      delete CliqzUtils.USER_LAT;
      delete CliqzUtils.USER_LNG;
    }
    CliqzUtils.search(e);
  },
  getCardUrl: function() {
    var NOT_SHAREABLE_SIGNAL = '-1';
    if(CLIQZ.UI.lastResults && CLIQZ.UI.lastResults[CLIQZ.UI.currentPage]) {
      osAPI.shareCard(CLIQZ.UI.lastResults[CLIQZ.UI.currentPage].url || NOT_SHAREABLE_SIGNAL);
    } else {
      osAPI.shareCard(NOT_SHAREABLE_SIGNAL);
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
  },
  onBoardingSwipe: function () {
    CLIQZ.UI.onBoardingSwipe();
  },
  onUrlbarFocus: function () {
    CliqzUtils.setSearchSession(CliqzUtils.rand(32));
  }
}
