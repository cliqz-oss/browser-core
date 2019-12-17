/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const base = require('../releases/amo-webextension');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl, {
    channel: '99',
    onboardingVersion: -1, // Disable onboarding
  }),
  default_prefs: Object.assign({}, base.default_prefs, {
    showConsoleLogs: true,
    developer: true,
    'modules.anolysis.enabled': true,
  }),
  modules: base.modules.concat([
    'integration-tests',
    'dropdown-tests',
  ]),
  bundles: base.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
});
