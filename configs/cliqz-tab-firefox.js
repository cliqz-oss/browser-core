/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const cliqzBase = require('./cliqz-tab');

module.exports = Object.assign({}, cliqzBase, {
  publish: 'web-ext sign -s build/ --api-key=$UPLOAD_API_KEY --api-secret=$UPLOAD_API_SECRET --id="{0ea88bc4-03bd-4baa-8153-acc861589c1c}" --timeout=0 && true',
});
