/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('../cliqz-tab');
const publish = require('../common/publish');

const id = 'jagljfhhkmnjajmkkkmomddipnifkkmn';
const MODULE_BLACKLIST = [
  'overlay',
];

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrerelease('cliqz_tab_beta_', 'cliqztab_pre', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'appName',
    channel: 'CT10', // Cliqz Tab Chrome Release
  }),
  modules: configBase.modules.filter(m => MODULE_BLACKLIST.indexOf(m) === -1),
  default_prefs: Object.assign({}, configBase.default_prefs, {
  }),
});
