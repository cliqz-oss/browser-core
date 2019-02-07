import Counter from '../../core/helpers/counter';

import { indicesHistogramToArray } from '../analyses-utils';

/**
 * news-pagination analysis allows us to learn how users interact with the
 * pagination of freshtab's news. We only learn how many time during a day a
 * user has clicked on each of the pagination buttons (histogram).
 */
export default {
  name: 'news-pagination',
  needsGid: true,
  version: 1,
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
