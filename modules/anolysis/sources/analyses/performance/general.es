/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import baseWebreqpipeMetric, { MS_TO_BIN_NAME } from '../../metrics/performance/webrequest-pipeline';

export default {
  name: 'analysis.performance.general',
  schema: baseWebreqpipeMetric.schema,
  version: 1,
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
