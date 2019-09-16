/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

const addSnippetsResults = (results, snippetsResult) => [snippetsResult, ...results];

export const addSnippetsResultsToResultResponses = (
  resultResponse,
  snippetsResponse,
) => {
  const { results } = resultResponse;
  const { snippets } = snippetsResponse;

  const resultsWithSnippets = Array.isArray(snippets) && snippets.length > 0
    ? addSnippetsResults(results, snippets[0])
    : results;

  return {
    ...resultResponse,
    results: resultsWithSnippets,
  };
};

export default function (results$, snippets$) {
  return combineLatest(results$, snippets$.pipe(startWith({ snippets: [] })))
    .pipe(
      map(([resultResponse, snippetsResponse]) =>
        addSnippetsResultsToResultResponses(resultResponse, snippetsResponse))
    );
}
