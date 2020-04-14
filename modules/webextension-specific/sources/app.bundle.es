/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import App from '../core/app';
import config from '../core/config';
import console from '../core/console';
import { isAMO } from '../core/platform';

const CLIQZ = {};

function triggerOnboardingOffers(onInstall) {
  // calls the offers action only if the module is present
  const offersModule = CLIQZ.app.modules['offers-v2'];
  if (offersModule) {
    offersModule.action('triggerOnboardingOffers', onInstall);
  }
}

async function onboarding(details) {
  if (details.reason === 'install' && config.settings.channel !== '99') {
    await CLIQZ.app.ready();

    if (config.settings.SHOW_ONBOARDING_OVERLAY) {
      chrome.tabs.create({});
    }

    triggerOnboardingOffers(true);
  }
}

// Holds mapping of dependent moudles, used to
// skip installation of modules
const moduleSchema = {
  offers: [
    'browser-panel',
    'myoffrz-helper',
    'offers-banner',
    'offers-templates',
    'offers-v2',
  ]
};

// modules which need not to be installed
const skipModules = [];

// Check from Cliqz browser if any special policy exist
if (chrome?.cliqz?.getPref) {
  const disabledModulesString = chrome.cliqz.getPref(
    'extensions.cliqz.enterprise.disabledModules'
  ) || '';

  if (disabledModulesString !== '') {
    // we will get list of disabled modules as a string like "offers|adblocker"
    const modules = disabledModulesString.split('|');
    modules.forEach((m) => {
      if (moduleSchema[m]) {
        skipModules.push(...moduleSchema[m]);
      } else {
        console.error(
          `Modules can't be uninstalled: ${m} is not defind in moduleSchema`
        );
      }
    });
  }
}

CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version,
  skipModules
});
window.CLIQZ = CLIQZ;

CLIQZ.app
  .start()
  .then(() => {
    if (isAMO) {
      const prefs = CLIQZ.app.prefs;

      if (prefs.get('humanWebOptOut') === undefined) {
        // default state for HumanWeb should be off
        // for all the users which did not interact with
        // the consent dialog in the past
        prefs.set('humanWebOptOut', true);
      } else {
        // we do not re-ask for consent for users which
        // already stated their desire
        prefs.set('consentDialogShown', true);
      }
    }

    triggerOnboardingOffers(false);
  });

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
  chrome.runtime.onInstalled.removeListener(onboarding);
});

const offboardingUrls = config.settings.offboardingURLs;

if (offboardingUrls && offboardingUrls.en) {
  const locale = chrome.i18n.getUILanguage();
  // Use English as default
  const offboardingUrl = offboardingUrls[locale] || offboardingUrls.en;
  chrome.runtime.setUninstallURL(offboardingUrl);
}

chrome.runtime.onInstalled.addListener(onboarding);
