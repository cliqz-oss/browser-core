/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from './prefs';

export default (settings, other = {}) =>
  ({
    ...settings,
    ...other,
    get RICH_HEADER() {
      return prefs.get('override.RICH_HEADER', settings.RICH_HEADER);
    },
    set RICH_HEADER(value) {
      prefs.set('override.RICH_HEADER', value);
    },
    get RESULTS_PROVIDER() {
      return prefs.get('override.RESULTS_PROVIDER', settings.RESULTS_PROVIDER);
    },
    set RESULTS_PROVIDER(value) {
      prefs.set('override.RESULTS_PROVIDER', value);
    },
    get RESULTS_PROVIDER_LOG() {
      return prefs.get('override.RESULTS_PROVIDER_LOG', settings.RESULTS_PROVIDER_LOG);
    },
    set RESULTS_PROVIDER_LOG(value) {
      prefs.set('override.RESULTS_PROVIDER_LOG', value);
    },
  });
