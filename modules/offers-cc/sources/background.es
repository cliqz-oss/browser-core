import background from '../core/base/background';
import { utils } from '../core/cliqz';

/**
  @namespace offers-cc
  @module offers-cc
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {
    this.is_enabled = utils.getPref('offersHubTrigger', 'off') !== 'off';
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  }
});
