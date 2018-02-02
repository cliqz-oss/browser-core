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
    if (prefs.has(UI_TOUR_PREF)) {
      prefs.clear(UI_TOUR_PREF);
    }

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
      defaultWidth: () => 264,
      defaultHeight: () => 70,
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

  events: {

  },

  actions: {

  }
});
