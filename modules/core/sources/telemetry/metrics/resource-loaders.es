/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'metrics.performance.app.resource-loaders',
  description: `
  This metric allows us to know how much size each resource loader takes.
  `,
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
      'extension',
    ],
  },
  schema: {
    type: 'array',
    items: {
      required: ['name', 'size'],
      properties: {
        name: { type: 'string' },
        size: { type: 'integer' },
      },
    },
  },
};
