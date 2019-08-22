/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const webextensionBase = require('../cliqz-tab');

module.exports = Object.assign({}, webextensionBase, {
  settings: Object.assign({}, webextensionBase.settings, {
    channel: '99',
    antitrackingPlaceholder: 'cliqz.com/tracking',
    antitrackingHeader: 'CLIQZ-AntiTracking',
  }),
  modules: webextensionBase.modules.concat([
    'antitracking',
    'adblocker',
    'integration-tests',
    'dropdown-tests',
    'content-script-tests',
  ]),
  default_prefs: {
    'logger.offers-v2.level': 'debug',
    showConsoleLogs: true,
  },
  bundles: webextensionBase.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
