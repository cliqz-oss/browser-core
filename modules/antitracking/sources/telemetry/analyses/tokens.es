/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */
import { mean, median } from '../../../core/helpers/statistics';
import { SOURCES } from '../metrics/tokens';

const distribution = {
  properties: {
    min: { type: 'number', minimum: 0 },
    max: { type: 'number', minimum: 0 },
    mean: { type: 'number', minimum: 0 },
    median: { type: 'number', minimum: 0 },
  }
};

function getDistribution(arr) {
  if (arr.length === 0) {
    return {
      min: null,
      max: null,
      mean: null,
      median: null,
    };
  }

  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
    mean: Math.round(mean(arr)),
    median: median(arr),
  };
}

export default [{
  name: 'antitracking.tokens.batches',
  sendToBackend: {
    version: 1,
  },
  generate: ({ records }) => {
    const batches = records.get('metrics.antitracking.tokens.batch');
    return SOURCES.map(source => batches.filter(m => m.source === source))
      .filter(sourceBatches => sourceBatches.length > 0)
      .map((sourceBatches) => {
        const metrics = sourceBatches.reduce((signals, metric) => {
          Object.keys(metric).forEach((m) => {
            if (!signals[m]) {
              signals[m] = [];
            }
            signals[m].push(metric[m]);
          });
          return signals;
        }, {});
        return {
          source: sourceBatches[0].source,
          batches: metrics.size.length,
          size: getDistribution(metrics.size),
          toBeSentSize: getDistribution(metrics.toBeSentSize),
          overflow: getDistribution(metrics.overflow),
          messages: getDistribution(metrics.messages),
        };
      });
  },
  schema: {
    required: [
      'source',
      'batches',
      'size',
      'toBeSentSize',
      'overflow',
      'messages',
    ],
    properties: {
      source: { type: 'string', enum: SOURCES },
      batches: { type: 'number', minimum: 0 },
      size: distribution,
      toBeSentSize: distribution,
      overflow: distribution,
      messages: distribution,
    },
  }
}, {
  name: 'antitracking.tokens.cleaning',
  sendToBackend: {
    version: 1,
  },
  generate: ({ records }) => {
    const batches = records.get('metrics.antitracking.tokens.clean');
    return SOURCES.map(source => batches.filter(m => m.source === source))
      .filter(sourceBatches => sourceBatches.length > 0)
      .map((sourceBatches) => {
        const metrics = sourceBatches.reduce((signals, metric) => {
          Object.keys(metric).forEach((m) => {
            if (!signals[m]) {
              signals[m] = [];
            }
            signals[m].push(metric[m]);
          });
          return signals;
        }, {});
        return {
          source: sourceBatches[0].source,
          runs: metrics.dbSize.length,
          dbSize: (
            metrics.dbSize.length !== 0
              ? Math.round(mean(metrics.dbSize))
              : null
          ),
          cacheSize: (
            metrics.cacheSize.length !== 0
              ? Math.round(mean(metrics.cacheSize))
              : null
          ),
          dbDelete: getDistribution(metrics.dbDelete),
          cacheDeleted: getDistribution(metrics.cacheDeleted),
          processed: getDistribution(metrics.processed),
        };
      });
  },
  schema: {
    required: [
      'source',
      'runs',
      'dbSize',
      'cacheSize',
      'dbDelete',
      'cacheDeleted',
      'processed',
    ],
    properties: {
      source: { type: 'string', enum: SOURCES },
      runs: { type: 'number', minimum: 0 },
      dbSize: { type: 'number', minimum: 0 },
      cacheSize: { type: 'number', minimum: 0 },
      dbDelete: distribution,
      cacheDeleted: distribution,
      processed: distribution,
    },
  }
}];
