/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Counter from '../../../../core/helpers/counter';

import {
  RESULT_CLASSES,
  mkCountSchema,
  mkCountsSchema,
} from '../../helpers';

export default {
  name: 'search.analysis.sessions.search-engines',
  description: 'How often were different alternative or default search engines used?',
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
      'extension',
    ],
  },
  generate: ({ records }) => {
    const signals = records.get('search.metric.session.interaction');

    if (signals.length === 0) {
      return [];
    }

    // ignore sessions without user input as they are no real search
    // sessions, but artifacts of how we delimit search sessions using focus
    // and blur (e.g., clicking inside the URL bar and outside right away
    // creates a search session that should be ignored since the user did not
    // search for anything)
    const sessions = signals.filter(({ hasUserInput }) => hasUserInput);

    // selections (i.e., selected results) across sessions
    const selections = sessions.map(({ selection = [] }) => selection);
    // other (default or alternative) search engine
    const selectionsOther = selections.filter(s => s.origin === 'other');
    const selectionsSearchEngineClasses = selectionsOther
      // flatten selections across sessions
      .reduce((acc, cur) => acc.concat(cur), [])
      // flatten classes
      .map(({ classes = [] }) => classes)
      .reduce((acc, cur) => acc.concat(cur), []);
    const selectionsSearchEnginesCounter = new Counter(selectionsSearchEngineClasses);

    return [{
      // statistics on selections across sessions
      selections: {
        // count of all sessions with selections, which is the same as
        // count of all sessions with user input since 'abandoned' selections
        // are included (i.e., when the user closes the dropdown without
        // selecting a result)
        total: selections.length,
        other: selectionsOther.length,
        class: selectionsSearchEnginesCounter.size === 0
          ? {}
          : Object.assign(
            ...Array.from(selectionsSearchEnginesCounter.entries()).map(([k, v]) => ({ [k]: v }))
          ),
      },
    }];
  },
  schema: {
    required: ['selections'],
    properties: {
      selections: {
        required: ['total', 'other', 'class'],
        properties: {
          ...mkCountSchema('total'),
          ...mkCountSchema('other'),
          class: {
            required: [],
            properties: {
              ...mkCountsSchema(RESULT_CLASSES)
            },
          },
        },
      },
    },
  },

};
