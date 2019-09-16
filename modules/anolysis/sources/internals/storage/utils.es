/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function sortByTs(signals) {
  // Sort signals by `ts`
  return signals.sort((s1, s2) => {
    if (s1.ts === undefined || s1.ts < s2.ts) {
      return -1;
    }
    if (s2.ts === undefined || s1.ts > s2.ts) {
      return 1;
    }
    return 0;
  });
}
