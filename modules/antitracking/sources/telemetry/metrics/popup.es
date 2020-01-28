/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [{
  name: 'metrics.antitracking.popup.action',
  schema: {
    required: ['target'],
    properties: {
      action: { type: 'string', enum: ['click'] },
      target: { type: 'string', enum: ['whitelist_domain', 'unwhitelist_domain', 'clearcache'] },
    },
  },
}];
