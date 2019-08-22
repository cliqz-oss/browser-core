/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import metrics from '../metrics/legacy-control-center';

const metricPrefix = 'metrics.legacy.control_center.';
const metricNames = metrics.map(m => m.name);

function getMetricShortName(name) {
  return name.replace(metricPrefix, '');
}

const metricShortNames = metricNames.map(getMetricShortName);

export default [{
  name: 'control-center-interaction',
  version: 1,
  generate: ({ records }) => {
    /**
     * This analysis simply sums the control-center interaction messages of each type. See the
     * legacy-control-center metric definitions for the possible metric names.
     */
    const signalCounts = metricNames.reduce((map, name) => ({
      [getMetricShortName(name)]: records.get(name).length,
      ...map
    }), {});

    return [{
      ...signalCounts,
    }];
  },
  schema: {
    require: metricShortNames,
    properties: metricShortNames.reduce((props, name) => ({
      [getMetricShortName(name)]: { type: 'number' },
      ...props
    }), {}),
  },
}];
