/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../../core/prefs';

export default [
  {
    name: 'cookie-monster.cookieBatch',
    schema: {
      required: ['count', 'existing', 'visited', 'deleted', 'modified', 'expired',
        'localStorageDeleted'],
      properties: {
        count: { type: 'number', minimum: 0 },
        existing: { type: 'number', minimum: 0 },
        visited: { type: 'number', minimum: 0 },
        deleted: { type: 'number', minimum: 0 },
        modified: { type: 'number', minimum: 0 },
        expired: { type: 'number', minimum: 0 },
        localStorageDeleted: { type: 'number', minimum: 0 },
      },
    },
  }, {
    name: 'cookie-monster.prune',
    schema: {
      required: ['visitsPruned', 'cookiesPruned', 'visitsCount', 'cookiesCount', 'sessionsPruned',
        'totalCookies', 'totalOrigins'],
      properties: {
        visitsPruned: { type: 'number', minimum: 0 },
        cookiesPruned: { type: 'number', minimum: 0 },
        visitsCount: { type: 'number', minimum: 0 },
        cookiesCount: { type: 'number', minimum: 0 },
        sessionsPruned: { type: 'number', minimum: 0 },
        totalCookies: { type: 'number', minimum: 0 },
        totalOrigins: { type: 'number', minimum: 0 },
      }
    }
  }, {
    name: 'cookie-monster.config',
    offsets: [0],
    generate: () => [{
      sessionExpiryEnabled: prefs.get('cookie-monster.expireSession', false),
      nonTrackerEnabled: prefs.get('cookie-monster.nonTracker', false),
      cookieMode: prefs.get('attrack.cookieMode', 'thirdparty'),
      cookieBehavior: prefs.get('network.cookie.cookieBehavior', 5, ''),
      trackerLocalStorageEnabled: prefs.get('cookie-monster.trackerLocalStorage', false),
    }],
    schema: {
      required: [
        'sessionExpiryEnabled',
        'nonTrackerEnabled',
        'cookieMode',
        'cookieBehavior',
        'trackerLocalStorageEnabled',
      ],
      properties: {
        sessionExpiryEnabled: { type: 'boolean' },
        nonTrackerEnabled: { type: 'boolean' },
        cookieMode: { type: 'string', enum: ['thirdparty', 'trackers', 'ghostery'] },
        cookieBehavior: { type: 'number', enum: [0, 1, 2, 3, 4, 5] },
        trackerLocalStorageEnabled: { type: 'boolean' },
      },
    },
  },
];
