/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('../common/urls-cliqz');

module.exports = {
  platform: 'webextension',
  format: 'system',
  brocfile: 'Brocfile.node.js',
  baseURL: '/',
  testsBasePath: './build/',
  testem_launchers: ['unit-node'],
  testem_launchers_ci: ['unit-node'],
  settings: Object.assign({}, urls, {
    id: 'cliqz@cliqz.com',
    name: 'Cliqz',
    channel: '99',
    antitrackingHeader: 'CLIQZ-AntiTracking',
    // TODO: need to find a better way to include this in the config
    // default setting for the module may be okay
  }),
  default_prefs: {
  },
  bundles: [
  ],
};
