/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const base = require('../cliqz-ios');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, base, {
  settings: Object.assign({}, base.settings, ciUrl),
  default_prefs: Object.assign({}, base.default_prefs, {
    developer: true,
    showConsoleLogs: true,
  }),
});
