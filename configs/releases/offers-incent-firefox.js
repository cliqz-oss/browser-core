/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'incent@myoffrz.com';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('incent_offers', 'offers_pre', 'firefox', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'incentAppName',
    storeName: 'incent_offers', // TODO
    channel: 'MN00', // Incent Offers Firefox Release
    OFFERS_BRAND: 'incent',
  }),
  versionPrefix: '16',
  specific: 'offers',
  PRODUCT_PREFIX: 'incent',
  PRODUCT_TITLE: 'Incent Offers',
});
