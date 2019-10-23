/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'freundin@myoffrz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('freundin_offers', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'freundinAppName',
    storeName: 'freundin_offers', // TODO
    channel: 'MF00', // Freundin Offers Firefox Release
    OFFERS_CHANNEL: 'freundin',
    OFFERS_BRAND: 'freundin',
  }),
  versionPrefix: '15',
  specific: 'offers',
  PRODUCT_PREFIX: 'freundin',
  PRODUCT_TITLE: 'Freundin Offers',
});
