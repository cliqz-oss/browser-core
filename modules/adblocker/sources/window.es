import { getActiveTab } from '../platform/browser';

import { isUrl } from '../core/url';
import prefs from '../core/prefs';

import CliqzADB from './adblocker';
import {
  adbABTestEnabled,
  ADB_PREF_VALUES,
  ADB_PREF_OPTIMIZED,
  ADB_PREF,
} from './config';


export default class Win {
  constructor({ window }) {
    this.window = window;
  }

  init() {
  }

  unload() {
  }

  status() {
    if (!adbABTestEnabled()) {
      return undefined;
    }

    return getActiveTab().then(({ id, url }) => {
      const isCorrectUrl = isUrl(url);
      let disabledForUrl = false;
      let disabledForDomain = false;
      let disabledEverywhere = false;

      // Check if adblocker is disabled on this page
      if (isCorrectUrl && CliqzADB.adblockInitialized) {
        const whitelist = CliqzADB.urlWhitelist.getState(url);
        disabledForDomain = whitelist.hostname;
        disabledForUrl = whitelist.url;
      }

      const report = CliqzADB.adbStats.report(id);
      const enabled = prefs.get(ADB_PREF, false) !== ADB_PREF_VALUES.Disabled;
      disabledEverywhere = !enabled && !disabledForUrl && !disabledForDomain;

      // Check stat of the adblocker
      let state;
      if (!enabled) {
        state = 'off';
      } else if (disabledForUrl || disabledForDomain) {
        state = 'off';
      } else {
        state = 'active';
      }

      // Check disable state
      let offState;
      if (disabledForUrl) {
        offState = 'off_website';
      } else if (disabledForDomain) {
        offState = 'off_domain';
      } else if (disabledEverywhere) {
        offState = 'off_all';
      } else {
        offState = 'off_website';
      }

      return {
        visible: true,
        enabled: enabled && !disabledForDomain && !disabledForUrl,
        optimized: prefs.get(ADB_PREF_OPTIMIZED, false) === true,
        disabledForUrl,
        disabledForDomain,
        disabledEverywhere,
        totalCount: report.totalCount,
        advertisersList: report.advertisersList,
        advertisersInfo: report.advertisersInfo,
        state,
        off_state: offState,
      };
    });
  }
}
