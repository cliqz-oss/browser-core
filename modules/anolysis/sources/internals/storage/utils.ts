/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Records } from '../records';
import { Behavior } from '../signal';

import * as behavior from './types/behavior';

export function sortByTs<T extends { ts: number }>(signals: T[]): T[] {
  // Sort signals by `ts`
  return signals.sort((s1, s2) => {
    if (s1.ts < s2.ts) {
      return -1;
    }
    if (s1.ts > s2.ts) {
      return 1;
    }
    return 0;
  });
}

export function groupBehaviorEntriesByType(entries: Array<behavior.Entry>): Records {
  const signals = sortByTs(entries);
  const types: Map<string, Behavior[]> = new Map();
  for (const { type, behavior } of signals) {
    let values = types.get(type);
    if (values === undefined) {
      values = [];
      types.set(type, values);
    }
    values.push(behavior);
  }
  return new Records(types);
}
