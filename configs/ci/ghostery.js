/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const ghosteryBase = require('../ghostery');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, ghosteryBase, {
  settings: Object.assign({}, ghosteryBase.settings, {
    channel: '99',
  }, ciUrl),
});
