/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const offersBase = require('../offers.js');

module.exports = Object.assign({}, offersBase, {
  settings: Object.assign({}, offersBase.settings, {
    channel: '99',
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
  }),
  modules: offersBase.modules.concat([
    'adblocker',
    'integration-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    'logger.offers-v2.level': 'debug',
    showConsoleLogs: true,
  },
  bundles: offersBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
