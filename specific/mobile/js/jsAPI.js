

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
    if(CLIQZ.UI.lastResults && CLIQZ.UI.lastResults[CLIQZ.UI.currentPage * CLIQZ.UI.nCardsPerPage]) {
      osAPI.shareCard(CLIQZ.UI.lastResults[CLIQZ.UI.currentPage * CLIQZ.UI.nCardsPerPage].url || NOT_SHAREABLE_SIGNAL);
    } else {
      osAPI.shareCard(NOT_SHAREABLE_SIGNAL);
    }
  },
  setClientPreferences: function(prefs) {
    // clear cache with every visit to tab overiew and settings
    Search && Search.clearResultCache();
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
    if (!CLIQZ.UI) { // history view
      History.onShow();
    }
  },
  onBoardingSwipe: function () {
    CLIQZ.UI.onBoardingSwipe();
  },
  onUrlbarFocus: function () {
    CliqzUtils.setSearchSession(CliqzUtils.rand(32));
  }
}
