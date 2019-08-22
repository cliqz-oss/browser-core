/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const cliqzBase = require('./cliqz-tab');

const id = 'khlmffibhhjkfjiflcmpiodjmkbkianc';

module.exports = Object.assign({}, cliqzBase, {
  publish: `webstore upload --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --source cliqz_tab_nightly_-$VERSION.zip --extension-id ${id} && webstore publish --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --extension-id ${id}`,
  settings: Object.assign({}, cliqzBase.settings, {
    channel: 'CT12', // Cliqz Tab Chrome Beta
  })
});
