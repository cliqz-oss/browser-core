/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import historySearch from '../../core/history-search';

import { unsafeClean } from '../operators/clean';
import deduplicate from '../operators/results/deduplicate';
import normalize from '../operators/normalize';

import BaseProvider from './base';

export default class History extends BaseProvider {
  constructor() {
    super('history');
  }

  search(query, config, { allowEmptyQuery = false, isPrivate = false }) {
    if (!query && !allowEmptyQuery) {
      return this.getEmptySearch(config);
    }

    const historyPromise = new Promise(resolve => historySearch(query, resolve, isPrivate));
    return this.getResultsFromPromise(
      // TODO: deduplicate is again called in enriched, try to simplify;
      //       at the moment, both is needed: here because history returns
      //       duplicates (like http://cliqz.com and https://cliqz.com) and
      //       in enrich to remove rich data/history duplicates
      // filter out results without main link (clean above removes links)
      //
      // NOTE: here it is safe to use 'unsafe' operators since results have not
      // been shared with outside yet (see docstring of 'unsafeClean' function
      // for more details).
      historyPromise.then(({ results }) => deduplicate(results.map(result => unsafeClean(normalize({
        url: result.value,
        title: result.comment,
        originalUrl: result.value,
        type: result.style,
        style: result.style,
        text: query,
        provider: 'history',
        data: {
          ...result,
          kind: ['H'],
        },
      }))))),
      query,
      config,
    );
  }
}
