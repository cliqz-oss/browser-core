/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'myoffrz@cliqz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('myoffrz', 'offers_pre', 'edge', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'offersAppName',
    channel: 'MO20', // MyOffrz MS Edge Release
    storeName: 'TODO',
    // As long as non-Chromium Edge needs to be supported sent directly.
    // (Once Edge is Chromium based, it should support ECDH crypto operations,
    // which is needed for encryption. Without working encryption, keep
    // sending directly, as otherwise, the 3rd party proxy can read all traffic.)
    ENDPOINT_HPNV2_DIRECT: 'https://collector-hpn.cliqz.com',
    ENDPOINT_HPNV2_ANONYMOUS: 'https://collector-hpn.cliqz.com',
  }),
});
