/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Given a histogram which keys are indices (contiguous integers), creates an
 * array histogram where indices are the keys, and values are the counts
 * (defaulting to zero).
 *
 * e.g.:
 * >>> indexHistogramToArray(new Counter([1, 1, 2, 2, 2, 3, 1]))
 * [0, 3, 3, 1]
 */
// eslint-disable-next-line import/prefer-default-export
export function indicesHistogramToArray(counter) {
  const array = [];
  const maximumIndex = Math.max(...counter.keys());
  for (let i = 0; i <= maximumIndex; i += 1) {
    array.push(counter.get(i));
  }
  return array;
}
