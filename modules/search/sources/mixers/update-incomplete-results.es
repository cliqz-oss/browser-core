/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { merge as rxMerge } from 'rxjs';
import { map, filter, share, flatMap, withLatestFrom } from 'rxjs/operators';
import { getMainLink } from '../operators/normalize';

const getMainLinks = ({ results }) =>
  results.map(getMainLink);

const removeEmptyResults = ({ results, ...response }) => ({
  ...response,
  results: results
    .filter(result => getMainLink(result).template !== 'empty'),
});

const splitCompleteFromIncomplete = links =>
  ({
    incomplete: links.filter(link => link.meta.isIncomplete),
    complete: links.filter(link => !link.meta.isIncomplete)
  });


const isNotEmpty = links => links.incomplete.length > 0;

const getKey = link =>
  (['partial_url', 'query', 'suggestion', 'domain'].indexOf(link.meta.triggerMethod) !== -1 ? link.meta.triggerMethod : link.url);

const merge = ([{ results: completed }, { results: original, ...rest }]) => {
  const indices = new Map();
  const updated = [...original];

  original
    .forEach((result, index) => {
      const link = getMainLink(result);
      const key = getKey(link);
      indices.set(key, index);
    });
  completed
    .forEach((result) => {
      const link = getMainLink(result);
      const key = getKey(link);
      if (indices.has(key)) {
        const index = indices.get(key);
        updated[index] = result;
      }
    });

  return {
    ...rest,
    results: updated,
  };
};

export default function update(richHeader, cliqz$, query, config) {
  return rxMerge(
    cliqz$,
    cliqz$.pipe(
      map(getMainLinks),
      map(splitCompleteFromIncomplete),
      filter(isNotEmpty),
      flatMap(links => richHeader.search(query, [links.complete[0]], config)),
      withLatestFrom(cliqz$),
      map(merge)
    )
  ).pipe(
    map(removeEmptyResults),
    share()
  );
}
