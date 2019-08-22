/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { combineLatest } from 'rxjs';
import { startWith, map, filter } from 'rxjs/operators';

const EMPTY = Symbol('EMPTY');

/**
 * Like `combineLatest`, but emits as soon as one of the observables
 * has emitted (i.e., does not wait until all observables have emitted).
 * Therefore, the emitted Array varies in length.
 *
 * @function combineAnyLatest
 * @param {Observable[]} observables - The observables to combine.
 * @returns {operator} The `combineAnyLatest` static operator.
 */

export default observables => combineLatest(
  observables.map(observable$ => observable$.pipe(startWith(EMPTY)))
).pipe(
  map(values => values.filter(value => value !== EMPTY)),
  filter(combined => combined.length > 0)
);
