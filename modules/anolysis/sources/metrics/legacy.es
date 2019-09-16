/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [{
  name: 'metrics.legacy.abtests',
  schema: {
    required: ['action', 'name'],
    properties: {
      action: { type: 'string', enum: ['enter', 'leave'] },
      name: { type: 'string', regexp: '/^[0-9]{4}_[A-Z]$/' },
    },
  },
}, {
  name: 'metrics.legacy.environment.extended',
  schema: {
    required: ['history_days', 'history_urls', 'install_date'],
    properties: {
      history_days: { type: 'number' },
      history_urls: { type: 'number' },
      install_date: { type: 'number' },
    },
  },
}, {
  name: 'metrics.navigation',
  schema: {
    required: ['action'],
    properties: {
      action: { type: 'string', enum: ['location_change'] }
    }
  }
}, {
  name: 'metrics.legacy.antitracking',
  schema: {
    required: ['target'],
    properties: {
      target: { type: 'string', enum: ['whitelist_domain', 'unwhitelist_domain', 'clearcache'] },
    }
  }
}];
