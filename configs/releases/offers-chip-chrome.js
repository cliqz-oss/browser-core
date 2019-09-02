/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('../offers');
const publish = require('../common/publish');

const id = 'andnhgfaikmhgffhojpicepiedbemnep';

module.exports = Object.assign({}, configBase, {
  publish: publish.toPrereleaseFullName('chip_sparalarm', 'offers_pre', 'chrome', 'zip'),
  settings: Object.assign({}, configBase.settings, {
    id,
    name: 'chipAppName',
    description: 'chipAppDesc',
    storeName: `chip-sparalarm/${id}`,
    channel: 'MC10', // CHIP Sparalarm Chrome Release
    OFFERS_CHANNEL: 'chip',
    'chip-standalone.enabled': true,
    ONBOARDING_URL: 'https://sparalarm.chip.de/onboarding',
    OFFBOARDING_URL: 'https://sparalarm.chip.de/offboarding',
    SUPPORTED_LANGS: ['de'],
  }),
  versionPrefix: '14',
  specific: 'offers',
  OFFERS_PRODUCT_PREFIX: 'chip',
  OFFERS_PRODUCT_TITLE: 'CHIP Sparalarm',
});
