import config from '../core/config';
import background from '../core/base/background';
import utils from '../core/utils';
import prefs from '../core/prefs';

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
      prefs.set(utils.BROWSER_ONBOARDING_PREF, true);
    },

    finishOnboarding() {
      utils.openLink(utils.getWindow(), config.settings.NEW_TAB_URL);
    },
  },
});
