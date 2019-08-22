/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPref, setPref, hasPref } from './prefs';
import config from '../core/config';
import { chrome } from './globals';

const DEFAULT_DIST_VAL = 'web0003';
const DISTRIBUTION_PREF = 'offers.distribution.channel.ID';

export function getUserAgent() {
  return navigator.userAgent;
}

export async function getDistribution() {
  let distribution = getPref('distribution', '');
  if (chrome.demographics && !distribution
    && config.settings.channel === '40'
    && navigator.userAgent.indexOf('Mac OS') > -1) {
    distribution = await chrome.demographics.getMacDistribution() || DEFAULT_DIST_VAL;
    setPref('distribution', distribution);
  }
  return distribution;
}

export function getChannel() {
  if (chrome.cliqzAppConstants) { // Android
    return chrome.cliqzAppConstants.get('CLIQZ_CHANNEL') || config.settings.channel || '';
  }
  if (hasPref(DISTRIBUTION_PREF)) {
    return config.settings.channel + getPref(DISTRIBUTION_PREF, '');
  }
  return config.settings.channel || '';
}

export async function getInstallDate() {
  if (chrome.cliqzNativeBridge) { // Android
    return chrome.cliqzNativeBridge.callAction('getInstallDate', []);
  }
  return getPref('install_date', '');
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
