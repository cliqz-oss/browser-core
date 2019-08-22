/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import mixerTest, { modifyHistoryResults } from './helpers';
import { withHistoryView, withoutHistoryView } from './results/with-history-not-from-mixer';

export default function () {
  context('for results coming only from history with a result not from cliqz', function () {
    const results = modifyHistoryResults({ withHistoryView, withoutHistoryView });
    mixerTest({ isWithHistory: true, query: 'paper', results });
  });
}
