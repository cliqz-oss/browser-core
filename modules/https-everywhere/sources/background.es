import background from '../core/base/background';
import config from '../core/config';

const ADDON_ID = 'https-everywhere@cliqz.com';


export default background({
  init() {
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  status() {
    if (config.settings.channel !== '40') { // not browser
      return Promise.resolve({});
    }

    return browser.management.get(ADDON_ID).then((addon) => {
      if (!addon) {
        // we need to bail out if the addon is not installed
        return {};
      }

      return {
        visible: true,
        active: addon.enabled
      };
    }).catch(() => {});
  },

  events: {
    /**
    * @event control-center:toggleHttpsEverywhere
    */
    'control-center:toggleHttpsEverywhere': function toggler(data) {
      browser.cliqz.changeAddonState(ADDON_ID, data.newState === true);
    }
  }
});
