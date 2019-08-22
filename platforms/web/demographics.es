/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPref } from './prefs';
import getWindow from './window-api';
import config from '../core/config';

export function getUserAgent() {
  return getWindow().then(win => win.navigator.userAgent);
}

export function getDistribution() {
  return getPref('distribution', '');
}

export function getInstallDate() {
  return getPref('install_date', '');
}

export function getChannel() {
  return config.settings.channel;
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
