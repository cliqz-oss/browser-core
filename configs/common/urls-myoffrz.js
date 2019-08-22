/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const urls = require('./urls');

module.exports = Object.assign(urls('myoffrz.net', 'cdn2'), {
  NEW_TAB_URL: '/freshtab/home.html',

  // Available proxies are: https://proxy[1-100].(cliqz|humanweb).foxyproxy.com
  ENDPOINT_HPNV2_ANONYMOUS: 'https://proxy*.humanweb.foxyproxy.com', // hpnv2/sources/endpoints.es
});
