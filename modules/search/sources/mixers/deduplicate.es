/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { withLatestFrom, map } from 'rxjs/operators';
import { getDuplicateLinksByUrl } from '../operators/results/utils';
import { annotate, deduplicate } from '../operators/responses/deduplicate';
import combineAnyLatest from '../operators/streams/static/combine-any-latest';

// TODO: dedup before collecting (i.e., only for new results)
export default (target$, reference$) => {
  const duplicates$ = combineAnyLatest([target$, reference$])
    .pipe(map(([{ results: target } = { }, { results: reference } = { }]) =>
      getDuplicateLinksByUrl(target || [], reference || [])));

  return {
    target$: duplicates$.pipe(
      withLatestFrom(target$),
      map(([duplicates, response]) => deduplicate(response, duplicates))
    ),
    reference$: duplicates$.pipe(
      withLatestFrom(reference$),
      map(([duplicates, response]) => annotate(response, duplicates)),
    )
  };
};
