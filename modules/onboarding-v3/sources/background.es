/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../core/config';
import background from '../core/base/background';
import prefs from '../core/prefs';

/**
  @namespace onboarding-v3
  @module onboarding-v3
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  init() {

  },

  unload() {

  },

  events: {

  },

  actions: {
    show() {
      prefs.set(config.settings.onBoardingPref, true);
    },

    finishOnboarding() {
      chrome.tabs.reload();
    },

    openPrivacyReport({ tab: { windowId } = {} } = {}) {
      chrome.omnibox2.navigateTo(windowId, 'about:preferences#privacy-reports', { target: 'tab' });
    }
  },
});
