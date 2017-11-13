import prefs from '../core/prefs';
import background from '../core/base/background';
import { utils } from '../core/cliqz';


const UI_TOUR_PREF = 'offerCCUITourDismissed';
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

  get hasUITourClicked() {
    return prefs.get(UI_TOUR_PREF, false);
  },

  events: {

  },

  actions: {
    closeUITour() {
      prefs.set(UI_TOUR_PREF, true);
    },
  }
});
