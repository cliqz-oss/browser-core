/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import DefaultMap from '../../../core/helpers/default-map';

import metric from '../metrics/performance';

/**
 * Merge two histogram together. The result is a new object containing the sum
 * of all values from `histogram1` and `histogram2`.
 */
function mergeHistograms(histogram1, histogram2) {
  const mergedHistogram = Object.create(null);
  const keys = [...new Set([
    ...Object.keys(histogram1),
    ...Object.keys(histogram2),
  ])];
  for (let k = 0; k < keys.length; k += 1) {
    const key = keys[k];
    mergedHistogram[key] = (histogram2[key] || 0) + (histogram1[key] || 0);
  }

  return mergedHistogram;
}

/**
 * This analysis reports a list of histograms (one for each step of our
 * webrequest pipeline), which helps us identify bottle-necks or performances
 * issues with the way we process http request in the extension (e.g.:
 * anti-tracking, adblocking, etc.).
 */
export default {
  name: 'analysis.performance.webrequest-pipeline.timings',
  sendToBackend: {
    version: 1,
    demographics: [
      'campaign',
      'country',
      'install_date',
      'product',
      'extension',
      'browser',
      'os',
    ],
  },
  generate: ({ records }) => {
    const histogramsMetrics = records.get('metrics.performance.webrequest-pipeline.timings');

    if (histogramsMetrics.length === 0) {
      return [];
    }

    const cumulativeHistograms = new DefaultMap(() => Object.create(null));

    for (let i = 0; i < histogramsMetrics.length; i += 1) {
      const preAggregatedHistograms = histogramsMetrics[i];
      for (let j = 0; j < preAggregatedHistograms.length; j += 1) {
        const { step, histogram } = preAggregatedHistograms[j];
        cumulativeHistograms.update(
          step,
          existingHistogram => mergeHistograms(existingHistogram, histogram)
        );
      }
    }

    return [[...cumulativeHistograms.entries()]
      .filter(([, histogram]) => Object.keys(histogram) !== [0])
      .map(([step, histogram]) => ({
        step,
        histogram,
      }))
    ];
  },
  // Re-use the metric's schema
  schema: metric.schema,
};
