/* global jsAPI */

import background from '../core/base/background';
import events from '../core/events';

export default background({
  enabled() {
    return true;
  },
  init() {

  },

  unload() {

  },

  events: {
    'mobile-browser:show': jsAPI.onShow,
    'mobile-browser:search': jsAPI.search,
    'mobile-browser:notify-preferences': jsAPI.setClientPreferences,
    'mobile-browser:restore-blocked-topsites': jsAPI.restoreBlockedTopSites,
    'mobile-browser:set-search-engine': jsAPI.setDefaultSearchEngine,
    'mobile-browser:publish-card-url': jsAPI.getCardUrl,
    'mobile-browser:showcase-swipe-card': jsAPI.onBoardingSwipe,
    'mobile-browser:urlbar-focus': function (...args) {
      jsAPI.onUrlbarFocus.apply(jsAPI, args);
      events.pub('core:urlbar_focus', ...args);
    },
  },
});
