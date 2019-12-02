/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { chrome } from '../platform/globals';
import prefs from '../core/prefs';

/**
  @namespace onboarding-overlay
  @module onboarding-overlay
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {},

  unload() {},

  events: {
    'lifecycle:onboarding': function onOnboarding({ tabId }) {
      chrome.tabs.executeScript(tabId, {
        file: 'modules/onboarding-overlay/injector.js'
      });
    }
  },

  actions: {
    getConsentStatus() {
      return {
        // default pref for telemetry is true, for others prefs let's assume false
        telemetry: prefs.get('telemetry', true),
        humanWebOptOut: prefs.get('humanWebOptOut', false),
      };
    },
    saveConsentStatus({ telemetry, humanWebOptOut } = {}) {
      if (telemetry !== undefined) {
        prefs.set('telemetry', telemetry);
      }
      if (humanWebOptOut !== undefined) {
        prefs.set('humanWebOptOut', humanWebOptOut);
      }
    },
  }
});
