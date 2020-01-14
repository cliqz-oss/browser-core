/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [{
  name: 'metrics.dat.performance',
  description: 'Emitted by the Dat protocol extension to measure performance and functionality of the dat protocol.',
  sendToBackend: {
    version: 1,
    demographics: [
      'platform',
      'product',
    ]
  },
  schema: {
    required: ['duration', 'hour', 'version'],
    properties: {
      duration: { type: 'number', minimum: 0 },
      hour: { type: 'number', minimum: 0, maximum: 23 },
      version: { type: 'string' },
      idleMemory: { type: 'number', minimum: 0 },
      idleDispatches: { type: 'number', minimum: 0 },
      activeMemory: { type: 'number', minimum: 0 },
      activeDispatches: { type: 'number', minimum: 0 },
      tLoaded: { type: 'number', minimum: 0 },
      tReady: { type: 'number', minimum: 0 },
      tInfo: { type: 'number', minimum: 0 },
      loadedVersion: { type: 'number', minimum: 0 },
      finalVersion: { type: 'number', minimum: 0 },
      initialPeers: { type: 'number', minimum: 0 },
      finalPeers: { type: 'number', minimum: 0 },
    },
  },
}];
