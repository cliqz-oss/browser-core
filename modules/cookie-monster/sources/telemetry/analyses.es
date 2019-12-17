/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { sum, median, mean } from '../../core/helpers/statistics';

const number = { type: 'number' };

export default [{
  name: 'cookie-monster-performance',
  sendToBackend: {
    version: 3,
  },
  generate: ({ records }) => {
    const cookieBatchSignals = records.get('cookie-monster.cookieBatch');
    const cookiePruneSignals = records.get('cookie-monster.prune');
    const cookieConfigSignals = records.get('cookie-monster.config');
    const config = cookieConfigSignals[0] || {};

    const summaryStats = {
      moduleActive: cookieBatchSignals.length > 0 || cookiePruneSignals.length > 0,
      batches: cookieBatchSignals.length,
      prunes: cookiePruneSignals.length,
      ...config,
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
        medBatchSize: (
          batchSignals.count.length !== 0
            ? median(batchSignals.count)
            : null
        ),
        maxBatchSize: Math.max(...batchSignals.count),
        meanExisting: (
          batchSignals.existing.length !== 0
            ? mean(batchSignals.existing)
            : null
        ),
        meanVisited: (
          batchSignals.visited.length !== 0
            ? mean(batchSignals.visited)
            : null
        ),
        deleted: sum(batchSignals.deleted),
        modified: sum(batchSignals.modified),
        expired: sum(batchSignals.expired),
        localStorageDeleted: sum(batchSignals.localStorageDeleted || []),
      });
    }

    if (cookiePruneSignals.length > 0) {
      Object.assign(summaryStats, {
        cookiesSize: Math.max(...cookiePruneSignals.map(s => s.cookiesCount)),
        visitsSize: Math.max(...cookiePruneSignals.map(s => s.visitsCount)),
        visitsPruned: sum(cookiePruneSignals.map(s => s.visitsPruned)),
        cookiesPruned: sum(cookiePruneSignals.map(s => s.cookiesPruned)),
        sessionsPruned: sum(cookiePruneSignals.map(s => s.sessionsPruned)),
        totalCookies: Math.max(...cookiePruneSignals.map(s => s.totalCookies)),
        totalOrigins: Math.max(...cookiePruneSignals.map(s => s.totalOrigins)),
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
      expired: number,
      prunes: number,
      cookiesSize: number,
      visitsSize: number,
      visitsPruned: number,
      cookiesPruned: number,
      sessionExpiryEnabled: { type: 'boolean' },
      nonTrackerEnabled: { type: 'boolean' },
      trackerLocalStorageEnabled: { type: 'boolean' },
      cookieMode: { type: 'string', enum: ['thirdparty', 'trackers', 'ghostery'] },
      cookieBehavior: { type: 'number', enum: [0, 1, 2, 3, 4, 5] },
      localStorageDeleted: number,
      sessionsPruned: number,
      totalCookies: number,
      totalOrigins: number,
    },
  }
}];
