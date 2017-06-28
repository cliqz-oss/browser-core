import inject from '../core/kord/inject';
import background from '../core/base/background';

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  history: inject.module('history'),

  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  getSessionCount(query) {
    return this.history.action('getSessionCount', query);
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  }
});
