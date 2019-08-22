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
import { chrome } from '../platform/globals';
import { getResourceUrl } from '../core/platform';
import inject from '../core/kord/inject';
import {
  createUITourTarget,
  deleteUITourTarget,
} from '../core/ui-tour';

/**
  @namespace onboarding-v4
  @module onboarding-v4
  @class Background
 */
export default background({
  deps: {
    controlCenter: inject.module('control-center'),
  },

  /**
    @method init
    @param settings
  */
  init() {
    const styleUrl = getResourceUrl('onboarding-v4/styles/popup.css');
    chrome.cliqz.initTheme(styleUrl, 'onboarding-v4-stylesheet');
    createUITourTarget('onboarding-v4', '#cliqz_cliqz_com-browser-action2', 'cliqz_cliqz_com-browser-action2');
  },

  unload() {
    deleteUITourTarget('onboarding-v4');
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    setOnboardingAsShown() {
      prefs.set(config.settings.onBoardingPref, true);
    },

    openLink(url) {
      chrome.omnibox2.navigateTo(url, { target: 'tabshifted' });
    },

    openControlCenter() {
      setTimeout(() => {
        browser.cliqz.openBrowserActionPopup();
      }, 1000);
    },

    async setPrefs(allPrefs) {
      allPrefs.forEach((pref) => { prefs.set(pref.name, pref.value); });
      await this.deps.controlCenter.action('updateInstantly');
      return true;
    },
  },
});
