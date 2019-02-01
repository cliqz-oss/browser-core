import DefaultMap from '../../core/helpers/default-map';
import Counter from '../../core/helpers/counter';

import { indicesHistogramToArray } from '../analyses-utils';
import { NEWS_EDITIONS } from '../metrics/freshtab';

/**
 * news-snippets allows us to learn about how users interact with our news
 * features on freshtab. In particular, we can learn the amount of interaction
 * for each of our different news recommendation: topnews, breakingnews,
 * yournews. We also learn if there is engagement with the summaries appearing
 * on hover.
 */
export default {
  name: 'news-snippets',
  needsGid: true,
  version: 1,
  generate: ({ records }) => {
    const histogram = new DefaultMap(() => new Counter());
    [
      'freshtab.home.click.topnews',
      'freshtab.home.click.breakingnews',
      'freshtab.home.click.yournews',
      'freshtab.home.hover.topnews',
      'freshtab.home.hover.breakingnews',
      'freshtab.home.hover.yournews',
    ].forEach((name) => {
      records.get(name).forEach(({ edition, target, action, index }) => {
        histogram.update(`${edition}.${target}.${action}`, cnt => cnt.incr(index));
      });
    });

    // For each combination of (edition, target, action), create one signal.
    const signals = [];
    histogram.forEach((counter, key) => {
      const [edition, target, action] = key.split('.');
      signals.push({
        edition,
        target,
        action,
        histogram: indicesHistogramToArray(counter),
      });
    });

    return signals;
  },
  schema: {
    required: ['edition', 'target', 'action', 'histogram'],
    properties: {
      edition: { type: 'string', enum: NEWS_EDITIONS },
      target: { type: 'string', enum: ['topnews', 'yournews', 'breakingnews'] },
      action: { type: 'string', enum: ['hover', 'click'] },
      histogram: {
        type: 'array',
        items: { type: 'integer', minimum: 0 },
      },
    },
  },
};
