import prefs from '../core/prefs';
import config from '../core/config';
import inject from '../core/kord/inject';
import background from '../core/base/background';
import ToolbarButton from '../core/ui/toolbar-button';
import { getMessage } from '../core/i18n';
import { ORIGIN_NAME } from './window';

const UI_TOUR_PREF = 'offerCCUITourDismissed';

/**
  @namespace offers-cc
  @module offers-cc
  @class Background
 */
export default background({
  offersV2: inject.module('offers-v2'),

  /**
    @method init
  */
  init() {
    if (prefs.has(UI_TOUR_PREF)) {
      prefs.clear(UI_TOUR_PREF);
    }

    this.toolbarButton = new ToolbarButton({
      widgetId: 'offers-cc',
      default_title: getMessage('cliqz_offers'),
      default_popup: `${config.baseURL}offers-cc/index.html`,
      default_icon: () => `${config.baseURL}offers-cc/images/offers-cc-icon.svg`,
      badgeBackgroundColor: 'transparent',
      badgeText: '',
      defaultWidth: () => 264,
      defaultHeight: () => 70,
    });
    this.toolbarButton.build();

    // Unconditionally register real estate
    const msg = { realEstateID: ORIGIN_NAME };
    this.offersV2.action('registerRealEstate', msg).catch(() => {});
  },

  unload() {
    if (this.toolbarButton) {
      this.toolbarButton.shutdown();
      this.toolbarButton = null;
    }

    const msg = { realEstateID: ORIGIN_NAME };
    this.offersV2.action('unregisterRealEstate', msg).catch(() => {});
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  }
});
