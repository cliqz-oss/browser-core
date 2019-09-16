/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Counter from './counter';

/**
 * Given an array of integers, creates an (object) histogram where integers are
 * the keys and values are the counts. Allows for specifying bin size and bin
 * count (with catch-all, overflow bin).
 *
 * e.g.:
 * >>> integersToHistogram([1, 1, 2, 2, 2, 3, 1, 20])
 * { '1': 3, '2': 3, '3': 1, 'rest': 1 }
 */
const integersToHistogram = (values, { binSize = 1, binCount = 10, overflowBinName = 'rest' } = {}) =>
  new Counter(values
    .map(v => parseInt(v / binSize, 10))
    .map(v => ((!binCount || v < binCount) ? v * binSize : overflowBinName)))
    .toObj();

export default integersToHistogram;
