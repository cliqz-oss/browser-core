/* global jsAPI */

import background from 'core/base/background';

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
    'mobile-browser:clear-favorites': jsAPI.clearFavorites,
    'mobile-browser:clear-history': jsAPI.clearHistory,
  },
});
