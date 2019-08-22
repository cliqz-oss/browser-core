/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe, interval as rxInterval } from 'rxjs';
import { throttle, distinct } from 'rxjs/operators';

/**
 * Factory for the `throttleQueries` operator, which throttles a user's input.
 *
 * @function getThrottleQueries
 * @param {Object} config - The configuration.
 */
export default ({
  operators: {
    streams: {
      throttleQueries: {
        interval = 10,
      } = {},
    } = {},
  } = {},
} = {}) => pipe(
  throttle(() => rxInterval(interval), { trailing: true, leading: true }),
  distinct(),
);
