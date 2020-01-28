/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const browserBase = require('../browser');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    onboardingVersion: -1, // Disable onboarding
  }, ciUrl),
  default_prefs: Object.assign({}, browserBase.default_prefs, {
    freshtabConfig: JSON.stringify({
      background: {
        image: 'bg-default'
      }
    }),
  }),
  modules: browserBase.modules
    .concat([
      'dropdown-tests',
      'integration-tests',
      'content-script-tests',
    ]),
  bundles: browserBase.bundles.concat([
    'core/content-tests.bundle.js',
    'integration-tests/run.bundle.js',
    'integration-tests/experimental-apis/test-helpers/api.bundle.js',
  ]),
  builderDefault: Object.assign({}, browserBase.builderDefault, {
    globalDeps: Object.assign({}, browserBase.builderDefault.globalDeps, {
      chai: 'chai',
    }),
  })
});
