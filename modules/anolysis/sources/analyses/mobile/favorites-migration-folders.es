/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'analyses.favorites.migration.folders',
  version: 1,
  needsGid: true,
  sendToBackend: true,
  generate: ({ records }) => records.get('metrics.favorites.migration.folders').splice(-1),
  schema: {
    required: ['count', 'rootFolderCount', 'maxDepth'],
    properties: {
      count: { type: 'integer', minimum: 0 },
      rootFolderCount: { type: 'integer', minimum: 0 },
      maxDepth: { type: 'integer', minimum: 0 }
    }
  }
};
