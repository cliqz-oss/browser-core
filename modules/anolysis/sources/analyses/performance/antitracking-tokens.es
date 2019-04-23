/* eslint no-param-reassign: 'off' */
import { SOURCES } from '../../metrics/performance/antitracking-tokens';
import { mean, median } from '../../analyses-utils';

const distribution = {
  properties: {
    min: { type: 'number', minimum: 0 },
    max: { type: 'number', minimum: 0 },
    mean: { type: 'number', minimum: 0 },
    median: { type: 'number', minimum: 0 },
  }
};

function getDistribution(arr) {
  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
    mean: Math.round(mean(arr)),
    median: median(arr),
  };
}

export default [{
  name: 'antitracking.tokens.batches',
  version: 1,
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
  version: 1,
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
          dbSize: Math.round(mean(metrics.dbSize)),
          cacheSize: Math.round(mean(metrics.cacheSize)),
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
