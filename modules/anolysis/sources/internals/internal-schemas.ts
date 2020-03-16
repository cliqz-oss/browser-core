/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  /**
   * This metric can be emitted when an internal exception is raised in
   * Anolysis. It is sent with a general context information (e.g.: 'storage')
   * as well as the kind of exception which happened (e.g.: `TypeError: Cannot read ...`).
   */
  {
    name: 'metrics.anolysis.health.exception',
    description: 'emitted when internal storage cannot be initialized',
    sendToBackend: {
      version: 2,
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 1,
      },
      demographics: [
        'install_date',
        'product',
        'extension',
        'browser',
        'os',
      ],
    },
    schema: {
      required: ['context', 'exception'],
      properties: {
        context: { type: 'string', enum: ['storage'] },
        exception: { type: 'string' },
        autoPrivateMode: { type: 'boolean' },
      },
    },
  },
  {
    name: 'metrics.anolysis.health.storage',
    description: 'emitted when internal storage cannot be initialized',
    sendToBackend: {
      version: 2,
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 1,
      },
      demographics: [
        'install_date',
        'product',
        'extension',
        'browser',
        'os',
      ],
    },
    schema: {
      properties: {
        autoPrivateMode: { type: 'boolean' },
        state: {
          type: 'string',
          enum: ['broken', 'recovered', 'could_not_recover'],
        },
      },
    },
  },
];
