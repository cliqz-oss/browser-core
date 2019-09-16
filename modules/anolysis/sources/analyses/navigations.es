/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'analyses.legacy.navigation',
  version: 1,
  generate: ({ records }) => ([{
    locationChange: records.get('metrics.navigation').length,
  }]),
  schema: {
    require: ['locationChange'],
    properties: {
      locationChange: { type: 'number' },
    },
  }
};
