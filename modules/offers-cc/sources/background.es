import prefs from '../core/prefs';
import config from '../core/config';
import background from '../core/base/background';
import { utils } from '../core/cliqz';
import ToolbarButton from '../core/ui/toolbar-button';
import { getMessage } from '../core/i18n';


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
    this.is_enabled = utils.getPref('modules.offers-cc.enabled', true);

    if (!this.is_enabled) {
      return;
    }

    this.toolbarButton = new ToolbarButton({
      widgetId: 'offers-cc',
      default_title: getMessage('offers-hub-title'),
      default_popup: `${config.baseURL}offers-cc/index.html`,
      default_icon: `${config.baseURL}offers-cc/images/offers-cc-icon.svg`,
      badgeBackgroundColor: 'transparent',
      badgeText: '',
      defaultHeight: () => 180,
      defaultWidth: () => 550,
    });
    this.toolbarButton.build();
  },

  unload() {
    if (!this.is_enabled) {
      return;
    }

    this.toolbarButton.shutdown();
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
