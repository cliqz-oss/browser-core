/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../../core/kord/inject';

export default [
  {
    name: 'metrics.adblocker.enabled',
    description: 'Counts how many users have the adblocker enabled',
    sendToBackend: {
      version: 1,
      demographics: [
        'country',
        'extension',
        'install_date',
        'product',
      ],
    },
    offsets: [0],
    generate: async () => {
      try {
        const enabled = await inject.module('adblocker').action('isEnabled');
        return [{
          enabled: !!enabled,
        }];
      } catch (ex) {
        // We should always send a result for this signal, even if adblocker's
        // state cannot be retrieved (background is disabled, state is broken,
        // etc.)
        return [{
          enabled: false,
        }];
      }
    },
    schema: {
      required: ['enabled'],
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  },
];
