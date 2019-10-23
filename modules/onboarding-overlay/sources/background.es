/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { chrome } from '../platform/globals';

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
    'lifecycle:onboarding': function onOnboardibg({ tabId }) {
      chrome.tabs.executeScript(tabId, {
        file: 'modules/onboarding-overlay/injector.js'
      });
    }
  },

  actions: {}
});
