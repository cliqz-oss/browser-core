/* eslint no-param-reassign: 'off' */
import Stats from '../../../platform/lib/simple-statistics';
import { SOURCES } from '../../metrics/performance/antitracking-tokens';

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
    min: Stats.min(arr),
    max: Stats.max(arr),
    mean: Math.round(Stats.mean(arr)),
    median: Stats.median(arr),
  };
}

export default [{
  name: 'antitracking.tokens.batches',
  version: 1,
  generate: ({ records }) => {
    const batches = records.get('metrics.antitracking.tokens.batch');
    return SOURCES.map((source) => {
      const metrics = batches.filter(m => m.source === source)
        .reduce((signals, metric) => {
          Object.keys(metric).forEach((m) => {
            if (!signals[m]) {
              signals[m] = [];
            }
            signals[m].push(metric[m]);
          });
          return signals;
        }, {});
      return {
        source,
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
    return SOURCES.map((source) => {
      const metrics = batches.filter(m => m.source === source)
        .reduce((signals, metric) => {
          Object.keys(metric).forEach((m) => {
            if (!signals[m]) {
              signals[m] = [];
            }
            signals[m].push(metric[m]);
          });
          return signals;
        }, {});
      return {
        source,
        runs: metrics.dbSize.length,
        dbSize: Math.round(Stats.mean(metrics.dbSize)),
        cacheSize: Math.round(Stats.mean(metrics.cacheSize)),
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
