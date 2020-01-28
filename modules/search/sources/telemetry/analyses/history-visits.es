/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'analysis.history.visits.count',
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
    ],
  },
  generate: ({ records }) => {
    const visitsCountSignals = records.get('metrics.history.visits.count');

    if (visitsCountSignals.length === 0) {
      return [];
    }

    let count = visitsCountSignals.reduce((acc, cur) => acc + cur.visitsCount, 0);

    if (count > 300) {
      count = null;
    }

    return [{
      count,
    }];
  },
  schema: {
    required: ['count'],
    properties: {
      // capped at 300
      count: {
        oneOf: [
          // capped at 300
          { type: 'integer', minimum: 0, maximum: 300 },
          // report null if > 300
          { type: 'null' }
        ]
      }
    },
  },
};
