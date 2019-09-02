/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import mixerTest from './helpers';
import results from './results/only-cliqz-complex-query';

export default function () {
  context('for results coming only from cliqz for a complex query', function () {
    mixerTest({ query: 'best songs in 2018', results });
  });
}
