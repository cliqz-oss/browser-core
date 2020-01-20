/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Behavior } from '../../signal';
import { Records } from '../../records';
import SafeDate from '../../date';

/**
 * Persisted behavioral signal (i.e.: a metric).
 */
export interface Entry {
  behavior: Behavior;
  date: string;
  type: string;
  ts: number;
}

/**
 * This storage is used to persist locally instances of metrics which should be
 * made availabel for aggregation (i.e.: by analyses). Each behavioral signal
 * is stored alongside some metadata, see `Entry`.
 */
export interface Storage {
  getDatesWithData: (fromDate: SafeDate) => Promise<SafeDate[]>;
  getTypesForDate: (date: SafeDate) => Promise<Records>;
  add: (date: SafeDate, type: string, behavior: Behavior) => Promise<void>;
  deleteOlderThan: (date: SafeDate) => Promise<void>;

  // NOTE: this is only used for unit testing purposes.
  deleteByDate: (date: SafeDate) => Promise<void>;
}
