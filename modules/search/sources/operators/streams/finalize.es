/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';

import mapResponses from '../streams/map-responses';

import rerank from '../responses/rerank';

import addCompletionToResults from '../streams/add-completion-to-results';
import enhanceResults from '../streams/enhance-results';
import filterEmptyQueries from '../streams/filter-empty-queries';
import limitResults from '../streams/limit-results';
import mergeResults from '../streams/merge-results';
import reconstructResults from '../streams/reconstruct-results';
import smoothResults from '../streams/smooth-results';
import trimResults from '../streams/trim-results';
import waitForAllProviders from '../streams/wait-for-all-providers';
import eliminateRepeatedResults from '../streams/eliminate-repeated-results';

export default config => pipe(
  // off by default (see search/config)
  waitForAllProviders(config),
  smoothResults(config),
  filterEmptyQueries(config),
  limitResults(config),
  mergeResults(config),
  // only one response is left after `merge`
  addCompletionToResults(config),
  mapResponses(rerank, config),
  trimResults(config),
  enhanceResults(config),
  eliminateRepeatedResults(),
  reconstructResults(config),
);
