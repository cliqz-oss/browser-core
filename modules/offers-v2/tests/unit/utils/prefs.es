const defaultPrefs = new Map([['developer', true]]);
const prefs = new Map(defaultPrefs);

module.exports = {
  'core/prefs': {
    default: {
      init: () => Promise.resolve(),
      reset: function () {
        prefs.clear();
        defaultPrefs.forEach((v, k) => prefs.set(k, v));
      },
      get: function (k, v) {
        if (prefs.has(k)) {
          return prefs.get(k);
        }
        return v;
      },
      set: function (k, v) {
        prefs.set(k, v);
      },
      clear: function (k) {
        return prefs.delete(k);
      },
      getObject: function (k) {
        return k;
      },
      setMockVal: function (varName, val) {
        prefs.set(varName, val);
      },
    }
  },
  'core/config': {
    default: {
      settings: {
        OFFERS_BE_BASE_URL: 'https://offers-api.cliqz.com',
        'offers.user-journey.enabled': true,
      }
    }
  }
};
