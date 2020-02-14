/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPref, hasPref } from './prefs';
import config from '../core/config';
import { browser } from './globals';

const DISTRIBUTION_PREF = 'offers.distribution.channel.ID';

export function getUserAgent() {
  return navigator.userAgent;
}

export async function getDistribution() {
  return getPref('full_distribution', '');
}

export function getChannel() {
  if (browser.cliqzAppConstants) { // Android
    return browser.cliqzAppConstants.get('CLIQZ_CHANNEL') || config.settings.channel || '';
  }
  if (hasPref(DISTRIBUTION_PREF)) {
    return config.settings.channel + getPref(DISTRIBUTION_PREF, '');
  }
  return config.settings.channel || '';
}

export async function getInstallDate() {
  if (browser.cliqzNativeBridge) { // Android
    return browser.cliqzNativeBridge.callAction('getInstallDate', []);
  }
  return getPref('install_date', '');
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
