const prefs = new Map();

module.exports = {
  'core/prefs': {
    default: {
      init: () => Promise.resolve(),
      reset: function () {
        prefs.clear();
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
};
