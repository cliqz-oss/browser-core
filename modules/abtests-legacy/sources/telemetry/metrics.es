/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    name: 'metrics.abtests-legacy.enter',
    schema: {
      properties: {
        name: { type: 'string', regexp: '/^[0-9]{4}_[A-Z]$/' },
      },
    },
  },
  {
    name: 'metrics.abtests-legacy.leave',
    schema: {
      properties: {
        name: { type: 'string', regexp: '/^[0-9]{4}_[A-Z]$/' },
        disable: { type: 'boolean' },
      },
    },
  },
];
