/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';

export default [
  /**
   * Extension version, sent on each day the user is active.
   */
  {
    name: 'metrics.core.version.core',
    needsGid: false,
    sendToBackend: true,
    version: 1,
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
    needsGid: false,
    sendToBackend: true,
    version: 1,
    generate: () => [{
      version: prefs.get('distribution.version', '', ''),
    }],
    schema: {
      required: ['version'],
      properties: {
        version: { type: 'string' },
      },
    },
  }
];
