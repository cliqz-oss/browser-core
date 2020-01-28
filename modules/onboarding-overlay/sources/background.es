/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { chrome } from '../platform/globals';
import webNavigation from '../platform/webnavigation';
import prefs from '../core/prefs';

function inject(tabId) {
  chrome.tabs.executeScript(tabId, {
    file: 'modules/onboarding-overlay/injector.js'
  });
}
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
  init() {
    const overlayUrl = chrome.runtime.getURL('/modules/onboarding-overlay/index.html');

    // just after installing any extension firefox shows a popup asking the user
    // to grant the permission to have the extension run in private mode
    //
    // if the user grants this permission, Firefox restarts the extension and this
    // leaves the overlay popup orphan and without any access
    //
    // the following few lines try to detect if our overlay is injected and visible
    // if yes it will reload it and make it work again
    chrome.windows.getAll({ populate: true }, windows =>
      windows.forEach(window =>
        window.tabs.forEach(tab =>
          webNavigation.getAllFrames({ tabId: tab.id }, frames =>
            frames.forEach((frame) => {
              if (frame.url === overlayUrl) {
                inject(tab.id);
              }
            })))));
  },

  unload() {},

  events: {
    'lifecycle:onboarding': function onOnboarding({ tabId }) {
      inject(tabId);
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
