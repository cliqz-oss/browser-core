import background from '../core/base/background';
import utils from '../core/utils';

/**
  @namespace <namespace>
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
      utils.openLink(utils.getWindow(), utils.CLIQZ_NEW_TAB);
    },
  },
});
