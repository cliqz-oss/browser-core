import background from '../core/base/background';
import { getResourceUrl } from '../core/platform';
import { OS } from '../platform/platform';
import prefs from '../core/prefs';

export default background({
  enabled() {
    return true;
  },

  init() {
    if (prefs.get('developer', false)) {
      let url;
      if (OS.startsWith('Mac')) {
        url = getResourceUrl('theme/styles/theme-mac.css');
      } else if (OS.startsWith('Windows')) {
        url = getResourceUrl('theme/styles/theme-win.css');
      } else if (OS.startsWith('Linux')) {
        url = getResourceUrl('theme/styles/theme-linux.css');
      }

      if (url) {
        chrome.cliqz.initTheme(url, 'theme-stylesheet');
        chrome.cliqz.enableBlueTheme();
      }
    }
  },

  unload() {},

  events: {},

  actions: {}
});
