/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import moment from '../platform/lib/moment';
import prefs from './prefs';

/**
 * Check if a `config_ts` value is available.
 */
export function isSynchronizedDateAvailable() {
  return prefs.has('config_ts');
}

export function getSynchronizedDateFormatted() {
  if (isSynchronizedDateAvailable()) {
    return prefs.get('config_ts');
  }

  return null;
}

export default function getSynchronizedDate() {
  if (isSynchronizedDateAvailable()) {
    return moment(prefs.get('config_ts'), 'YYYYMMDD');
  }

  return null;
}
