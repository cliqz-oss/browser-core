/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Platform } from 'react-native';
import prefs from '../core/prefs';
import ua from './user-agent';

export function getUserAgent() {
  if (Platform.OS === 'ios') {
    // Because `core/demographics` expect a normal user agent, we fake one using
    // the values of Platform.OS and Platform.Version. It will be converted into
    // something like: { name: 'iOS', version: '9.3.5' }
    return `iPhone OS ${Platform.Version.replace(/[.]/g, '_')} like Mac OS X`;
  }

  return `android ${Platform.Version}`;
}

export function getDistribution() {
  // On mobile `distribution` is not set, and we only make use of `channel`.
  return '';
}

export function getInstallDate() {
  return ua.installDate;
}

export function getChannel() {
  return ua.channel || '';
}

export function getCountry() {
  return prefs.get('config_location.granular', '');
}
