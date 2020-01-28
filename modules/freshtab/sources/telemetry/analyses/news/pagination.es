/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Counter from '../../../../core/helpers/counter';

import { indicesHistogramToArray } from '../../helpers';

/**
 * news-pagination analysis allows us to learn how users interact with the
 * pagination of freshtab's news. We only learn how many time during a day a
 * user has clicked on each of the pagination buttons (histogram).
 */
export default {
  name: 'news-pagination',
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
    ],
  },
  generate: ({ records }) => {
    const paginationSignals = records.get('freshtab.home.click.news_pagination');

    if (paginationSignals.length === 0) {
      return [];
    }

    // Compute histogram of indices clicked
    const histogram = new Counter(paginationSignals.map(({ index }) => index));

    return [{
      clicks: indicesHistogramToArray(histogram),
    }];
  },
  schema: {
    required: ['clicks'],
    properties: {
      clicks: {
        type: 'array',
        items: { type: 'integer', minimum: 0 },
      },
    }
  }
};
