/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

//
// An action with its execution time in milliseconds.
//
export default {
  name: 'metrics.performance.general',
  schema: {
    required: ['action', 'ms'],
    properties: {
      action: {
        type: 'string',
        enum: [
          'offers-v2.trigger.process',
        ]
      },
      ms: { type: 'number', minimum: 0 },
    },
  },
};
