import config from '../core/config';
import background from '../core/base/background';
import utils from '../core/utils';

/**
  @namespace onboarding-v3
  @module onboarding-v3
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    show() {
      utils.setPref(utils.BROWSER_ONBOARDING_PREF, true);
    },

    finishOnboarding() {
      utils.openLink(utils.getWindow(), config.settings.NEW_TAB_URL);
    },
  },
});
