/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import deepEqual from 'fast-deep-equal';

/**
 * Shrinks a full normalized result into nested lists of urls
 *
 * @param {Object} result - The normalized result.
 */
const shrinkToUrls = ({ responses }) =>
  responses.map(({ results }) =>
    results.map(({ links }) =>
      links.map(({ url, extra = {} }) => url + Object.keys(extra).length)));

/**
 * Factory for the `eliminateRepeatedResults` operator, which eliminates
 * repeated results based on urls
 *
 * @function eliminateRepeatedResults
 */
export default () => pipe(
  distinctUntilChanged((a, b) => !b.query.forceUpdate
    && a.query.queryId === b.query.queryId
    && deepEqual(shrinkToUrls(a), shrinkToUrls(b)))
);
