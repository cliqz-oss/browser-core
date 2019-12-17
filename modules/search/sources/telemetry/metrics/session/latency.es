/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'search.metric.session.latency',
  // instant push
  sendToBackend: {
    version: 1,
  },
  schema: {
    required: ['backend', 'latency'],
    properties: {
      // add all available backends to enum
      backend: { type: 'string', enum: ['de', 'us', 'fr', 'uk', 'es', 'it'] },
      latency: {
        required: [],
        properties: {
          // in 20ms steps until 199ms
          // < 20ms
          0: { type: 'integer', minimum: 0 },
          20: { type: 'integer', minimum: 0 },
          40: { type: 'integer', minimum: 0 },
          60: { type: 'integer', minimum: 0 },
          80: { type: 'integer', minimum: 0 },
          100: { type: 'integer', minimum: 0 },
          120: { type: 'integer', minimum: 0 },
          140: { type: 'integer', minimum: 0 },
          160: { type: 'integer', minimum: 0 },
          180: { type: 'integer', minimum: 0 },
          200: { type: 'integer', minimum: 0 },
          // in 100ms steps until 999ms
          300: { type: 'integer', minimum: 0 },
          400: { type: 'integer', minimum: 0 },
          500: { type: 'integer', minimum: 0 },
          600: { type: 'integer', minimum: 0 },
          700: { type: 'integer', minimum: 0 },
          800: { type: 'integer', minimum: 0 },
          900: { type: 'integer', minimum: 0 },
          // >= 1000ms
          rest: { type: 'integer', minimum: 0 },
        }
      },
    }
  },
};
