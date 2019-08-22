/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { combineLatest, pipe } from 'rxjs';
import { pluck, first } from 'rxjs/operators';

/**
 * Similar to `skipUntil` but `waitFor` also emits the latest source value as
 * soon as the provided observable emits.
 *
 * @function waitFor
 * @param {Observable} signal$ - The observable to wait for.
 * @returns {operator} The `waitFor` operator.
 */
export default signal$ => pipe(
  obs => combineLatest(obs, signal$.pipe(first())),
  pluck(0),
);

// export default signal$ => combineLatest(signal$, signal$.pipe(first())).pipe
//   pluck(0),
// );
