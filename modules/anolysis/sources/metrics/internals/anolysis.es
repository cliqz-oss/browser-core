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
   * Anolysis. It is sent with a general context information (e.g.: 'gid-manager')
   * as well as the kind of exception which happened (e.g.: `TypeError: Cannot read ...`).
   */
  {
    name: 'metrics.anolysis.health.exception',
    sendToBackend: true,
    needsGid: false,
    version: 1,
    schema: {
      required: ['context', 'exception'],
      properties: {
        context: { type: 'string', enum: ['gid-manager', 'storage'] },
        exception: { type: 'string' },
      },
    },
  },
  {
    name: 'metrics.anolysis.health.storage',
    sendToBackend: true,
    needsGid: false,
    version: 1,
    schema: {
      properties: {
        state: {
          type: 'string',
          enum: ['broken', 'recovered', 'could_not_recover'],
        },
      },
    },
  },
];
