/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import inject from '../core/kord/inject';

import geolocation from './services/geolocation';

export default background({
  providesServices: {
    geolocation,
  },

  init() {
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  events: {
  },

  actions: {
    updateGeoLocation() {
      return inject.service('geolocation', ['updateGeoLocation']).updateGeoLocation();
    },
  },
});
