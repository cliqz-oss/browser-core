import config from '../core/config';
import background from '../core/base/background';
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
      prefs.set(config.settings.onBoardingPref, true);
    },

    finishOnboarding() {
      chrome.tabs.reload();
    },
  },
});
