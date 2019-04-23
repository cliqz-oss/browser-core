import { sum, median, mean } from '../analyses-utils';

const number = { type: 'number' };

export default {
  name: 'cookie-monster-performance',
  version: 1,
  generate: ({ records }) => {
    const cookieBatchSignals = records.get('cookie-monster.cookieBatch');
    const cookiePruneSignals = records.get('cookie-monster.prune');

    const summaryStats = {
      moduleActive: cookieBatchSignals.length > 0 || cookiePruneSignals.length > 0,
      batches: cookieBatchSignals.length,
      prunes: cookiePruneSignals.length,
    };
    if (cookieBatchSignals.length > 0) {
      const batchSignals = cookieBatchSignals.reduce((combined, signal) => {
        Object.keys(signal).forEach((name) => {
          const signals = combined[name] || [];
          signals.push(signal[name]);
          Object.assign(combined, { [name]: signals });
        });
        return combined;
      }, {});
      Object.assign(summaryStats, {
        medBatchSize: median(batchSignals.count),
        maxBatchSize: Math.max(...batchSignals.count),
        meanExisting: mean(batchSignals.existing),
        meanVisited: mean(batchSignals.visited),
        deleted: sum(batchSignals.deleted),
        modified: sum(batchSignals.modified),
      });
    }

    if (cookiePruneSignals.length > 0) {
      Object.assign(summaryStats, {
        cookiesSize: Math.max(...cookiePruneSignals.map(s => s.cookiesCount)),
        visitsSize: Math.max(...cookiePruneSignals.map(s => s.visitsCount)),
        visitsPruned: sum(cookiePruneSignals.map(s => s.visitsPruned)),
        cookiesPruned: sum(cookiePruneSignals.map(s => s.cookiesPruned)),
      });
    }

    return [summaryStats];
  },
  schema: {
    required: [
      'moduleActive',
      'batches',
      'prunes',
    ],
    properties: {
      moduleActive: { type: 'boolean' },
      batches: number,
      medBatchSize: number,
      maxBatchSize: number,
      meanExisting: number,
      meanVisited: number,
      deleted: number,
      modified: number,
      prunes: number,
      cookiesSize: number,
      visitsSize: number,
      visitsPruned: number,
      cookiesPruned: number,
    },
  }
};
