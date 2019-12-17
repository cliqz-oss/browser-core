/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'freshtab.analysis.generic.shows',
  description: 'How often was freshtab shown on a day?',
  needsGid: true,
  version: 1,
  generate: ({ records }) => {
    const showMetrics = records.get('freshtab.home.show');

    return [{ total: showMetrics.length }];
  },
  schema: {
    required: ['total'],
    properties: {
      total: { type: 'integer', minimum: 0 },
    },
  },
};
