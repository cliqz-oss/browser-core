/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const do5x = [...'12345'];
const do10x = [...'1234567890'];

// An array index is number of milliseconds, the value is the
// corresponding bin name. The constant helps an analyzer to
// construct the bin structure from individual measurements.
export const MS_TO_BIN_NAME = [
  '0', '1', '2', '3', '4',
  ...do5x.map(() => '5-9'),
  ...do5x.map(() => '10-14'),
  ...do5x.map(() => '15-19'),
  ...do5x.map(() => '20-24'),
  ...do5x.map(() => '25-29'),
  ...do10x.map(() => '30-39'),
  ...do10x.map(() => '40-49'),
  ...do10x.map(() => '50-59'),
  ...do10x.map(() => '60-69'),
  '70+'
];

export default {
  name: 'analysis.performance.general',
  sendToBackend: {
    version: 1,
  },
  schema: {
    required: ['step', 'histogram'],
    properties: {
      step: {
        type: 'string',
        enum: [
          'offers-v2.trigger.process',
        ],
      },
      histogram: { type: 'object' },
    },
  },
  generate: ({ records }) => {
    const getBucketForMs = (ms) => {
      if (ms < 0) {
        return MS_TO_BIN_NAME[0];
      }
      if (ms < MS_TO_BIN_NAME.length) {
        return MS_TO_BIN_NAME[ms];
      }
      return MS_TO_BIN_NAME[MS_TO_BIN_NAME.length - 1];
    };

    const summary = {};
    const batch = records.get('metrics.performance.general');
    batch.forEach(({ action, ms }) => {
      const actionHistogram = summary[action] || (summary[action] = {});
      const bucketName = getBucketForMs(ms);
      actionHistogram[bucketName] = (actionHistogram[bucketName] || 0) + 1;
    });

    //
    // Produce several signals, one for each action.
    //
    // The metric 'metrics.performance.webrequest-pipeline.timings'
    // encourages to send all the actions in one signal, what might
    // be unnecessary and could be leaking private information.
    //
    return Array.from(Object.keys(summary), action => [{
      step: action,
      histogram: summary[action]
    }]);
  },
};
