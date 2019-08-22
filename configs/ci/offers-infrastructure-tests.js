/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const offersBase = require('../offers');

module.exports = Object.assign({}, offersBase, {
  settings: Object.assign({}, offersBase.settings, {
    channel: '99',
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
    offersInfraTests: true,
  }),
  modules: offersBase.modules.concat([
    'adblocker',
    'integration-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    'integration-tests.grep': 'send fake signals to backend through hpn',
    showConsoleLogs: true,
  },
  bundles: offersBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
