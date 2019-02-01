import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import background from '../core/base/background';
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
    // Unconditionally register real estate
    const msg = { realEstateID: ORIGIN_NAME };
    this.offersV2.action('registerRealEstate', msg).catch(() => {});
  },

  unload() {
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
