/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'metrics.performance.app.startup',
  description: `
This metric allows us to know how long it took to load each modules from App.
This does not contain any user behavior, but instead informs about how App
loading performs depending on platforms or products.
  `,
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
      'browser',
      'extension',
    ],
  },
  schema: {
    type: 'array',
    items: {
      required: ['module', 'isEnabled', 'loadingTime'],
      additionalProperties: false,
      properties: {
        module: { type: 'string' },
        isEnabled: { type: 'boolean' },
        loadingTime: { type: ['integer', 'null'] },
        loadingTimeSync: { type: ['integer', 'null'] },
      },
    },
  },
};
