import background from '../core/base/background';

export default background({
  init() {
    this.listener = null;
  },

  unload() {
  },

  getState() {
    return {
      a: 42,
      test: true,
    };
  },

  actions: {
    contentScriptRan(state) {
      if (this.listener) {
        this.listener(state);
      }
      return true;
    }
  },
});
