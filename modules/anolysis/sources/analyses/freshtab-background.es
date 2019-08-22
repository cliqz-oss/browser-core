/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'analyses.freshtab.settings.background',
  version: 1,
  needsGid: false,
  generate: ({ records }) => {
    const freshtabConfigSignals = records.get('freshtab.prefs.config');
    if (freshtabConfigSignals.length === 0) {
      return [];
    }

    const {
      background: { index } = {},
    } = freshtabConfigSignals[freshtabConfigSignals.length - 1];

    if (index < 0 || index > 31) {
      return [{
        index: null
      }];
    }
    return [{
      index
    }];
  },
  schema: {
    required: ['index'],
    properties: {
      // index of selected background image
      index: { anyOf: [
        { type: 'integer', minimum: 0, maximum: 31 },
        { type: 'null' },
      ] },
    }
  },
};
