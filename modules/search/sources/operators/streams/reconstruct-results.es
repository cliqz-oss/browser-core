/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

const groupAsMap = (a, b) =>
  a.set(b.meta.type, [...(a.get(b.meta.type) || []), b]);

const groupAsArray = array => [
  ...array
    .reduce(groupAsMap, new Map())
    .entries()
];

const reconstructLink = (link, kind) => ({
  ...link,
  kind,
});

/*
 * Reconstruct a normalized result into its legacy format for rendering.
 * Opposite of `oeprators/normalize`.
 *
 * @param {Object} result - The normalized result.
 */
const reconstruct = ({ links }) => {
  const main = links.find(({ meta: { type } }) => type === 'main') || {};
  const history = links.filter(({ meta: { type } }) => type === 'history');
  const rest = links.filter(({ meta: { type } }) => type !== 'main' && type !== 'history');

  // TODO: fix data format: why is some information under data?
  const result = {
    ...main,
    data: {
      deepResults: groupAsArray(rest)
        .map(([type, sublinks]) => ({
          type,
          links: sublinks.map(link => reconstructLink(link, main.kind)),
        })),
      extra: main.extra,
      kind: main.kind || [],
      template: main.template,
      suggestion: main.suggestion,
    },
  };

  // if empty `urls` is added results render as history
  if (history.length > 0) {
    result.data.urls = history.map(link => reconstructLink(link, main.kind));
  }

  // Remove extra from result since we have it already in result.data.
  delete result.extra;

  return result;
};

/**
 * Factory for the `reconstructResults` operator, which converts results back
 * to a legacy format for rendering.
 *
 * @function reconstructResults
 */
export default () =>
  pipe(map(({
    query,
    responses,
    ...result
  }) => ({
    // TODO: keep spread all?
    ...result,
    query,
    responses: responses.map(response => ({
      // TODO: keep spread all?
      ...response,
      results: response.results.map(reconstruct)
    })),
  })));
