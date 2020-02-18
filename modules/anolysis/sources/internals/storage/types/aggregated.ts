/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import SafeDate from '../../date';

/**
 * A value of this type indicates that analysis `name` was already invoked for
 * `date`. This is used to not run the same analysis two times on the same day.
 */
export interface Entry {
  date: string;
  name: string;
}

/**
 * Allow to specify how often a given analysis can be invoked.
 */
export type Granularity = 'day' | 'week' | 'month';

/**
 * This storage is used to keep track of when each analysis was invoked. In
 * particular, it allows to only run each aggregation at most once per day.
 */
export interface Storage {
  runTaskAtMostOnce: (
    date: SafeDate,
    name: string,
    fn: () => Promise<void>,
    granularity: Granularity,
  ) => Promise<void>;
  deleteOlderThan: (date: SafeDate) => Promise<void>;

  // NOTE: this is only used for unit testing purposes.
  getAggregatedDates: () => Promise<string[]>;
}
