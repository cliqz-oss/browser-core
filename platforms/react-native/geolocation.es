/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';

const geoLocationModule = NativeModules.GeoLocation;

export default function () {
  return geoLocationModule.getCurrentPosition()
    .catch(() => Promise.reject(new Error('Unable to retrieve location')));
}
