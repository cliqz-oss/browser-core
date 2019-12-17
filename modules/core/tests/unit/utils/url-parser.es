/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const tldts = require('tldts-experimental');
const urlParser = require('@cliqz/url-parser');
const punycode = require('punycode');

module.exports = {
  'platform/lib/tldts': tldts,
  '@cliqz/url-parser': urlParser,
  punycode,
};
