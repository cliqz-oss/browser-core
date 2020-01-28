/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const base = require('../base/mobile-cards');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl, {
    CLEAR_RESULTS_AT_SESSION_START: true,
    'search.config.operators.streams.waitForAllProviders': true,
  }),
  default_prefs: Object.assign({}, base.default_prefs, {
    showConsoleLogs: true,
    developer: true,
  }),
  modules: base.modules.concat([
    'integration-tests',
    'content-script-tests',
  ]),
  bundles: base.bundles.concat([
    'integration-tests/run.bundle.js',
  ]),
  builderDefault: Object.assign({}, base.builderDefault, {
    globalDeps: Object.assign({}, base.builderDefault.globalDeps, {
      chai: 'chai',
    }),
  })
});
