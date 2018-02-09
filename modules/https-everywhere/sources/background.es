/* global AddonManager */

import background from '../core/base/background';
import prefs from '../core/prefs';
import config from '../core/config';
import { Components } from '../platform/globals';

Components.utils.import('resource://gre/modules/AddonManager.jsm');
const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
  .getService(Components.interfaces.nsIVersionComparator);
const ADDON_ID = 'https-everywhere@cliqz.com';
const STATE_PREF = 'extensions.https_everywhere.globalEnabled';
const FIRST_WEB_EXTENSION_VERSION = '2017.10.30';

const getAddon = () => new Promise((resolve) => {
  AddonManager.getAddonByID(ADDON_ID, addon => resolve(addon));
});

export default background({
  init() {
    // we need to keep the state for users migrating from the bootstrap
    // to the WebExtension version
    if (config.settings.channel === '40' && prefs.has(STATE_PREF, '')) { // browser
      getAddon().then((addon) => {
        if (versionChecker.compare(addon.version, FIRST_WEB_EXTENSION_VERSION) >= 0) {
          // if users have both the state pref and the WebExtension running we do the migration
          //
          // Cliqz version of HTTPS everywhere cannot be turned off internally
          // and only completely by the 'userDisabled' state

          /* eslint-disable no-param-reassign */
          addon.userDisabled = !prefs.get(STATE_PREF, false, '');
          /* eslint-enable param-reassign */
          prefs.clear(STATE_PREF, '');
        }
      });
    }
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  status() {
    if (config.settings.channel !== '40') { // not browser
      return Promise.resolve({});
    }

    return getAddon().then((addon) => {
      if (!addon) {
        // we need to bail out if the addon is not installed
        return {};
      }

      if (versionChecker.compare(addon.version, FIRST_WEB_EXTENSION_VERSION) >= 0) {
        // HTTPS_Everywhere version 2017.10.30 and above is an WebExtension
        // and we control it by its userDisabled state

        return {
          visible: true,
          active: !addon.userDisabled
        };
      }

      // HTTPS_Everywhere version below 2017.10.30 is using bootstrap technology
      // and we control it by the globalEnabled pref
      return {
        visible: addon.isActive,
        active: prefs.get(STATE_PREF, false, '')
      };
    });
  },

  events: {
    /**
    * @event control-center:toggleHttpsEverywhere
    */
    'control-center:toggleHttpsEverywhere': function toggler(data) {
      getAddon().then((addon) => {
        if (versionChecker.compare(addon.version, FIRST_WEB_EXTENSION_VERSION) >= 0) {
          addon.userDisabled = !data.newState;
        } else {
          prefs.set(STATE_PREF, data.newState, '');
        }
      });
    }
  }
});
