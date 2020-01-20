/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../../kord/inject';

export default [
  /**
   * Extension version, sent on each day the user is active.
   */
  {
    name: 'metrics.core.version.core',
    sendToBackend: {
      version: 1,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
    },
    offsets: [0],
    generate: () => [{
      version: inject.app.version,
    }],
    schema: {
      required: ['version'],
      properties: {
        version: { type: 'string' },
      },
    },
  },
  /**
   * Browser version, sent on each day the user is active.
   */
  {
    name: 'metrics.core.version.distribution',
    sendToBackend: {
      version: 1,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
    },
    offsets: [0],
    generate: async () => [{
      version: await inject.service('host-settings', ['get']).get('distribution.version', ''),
    }],
    schema: {
      required: ['version'],
      properties: {
        version: { type: 'string' },
      },
    },
  }
];
