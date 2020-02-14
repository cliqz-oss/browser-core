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
  name: 'search.analysis.sessions.smart-cliqz',
  description: 'How often were different SmartCliqz classes shown and selected?',
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

    // all non-empty last results shown across sessions; each set of last
    // results contains multiple individal results (rows) with multiple
    // sources each:
    //  results: [
    //    // 1st result (item)
    //    {
    //      sources: [...],
    //      classes: [...],
    //    },
    //    {
    //    // 2nd result (item)
    //       sources: [...]
    //      classes: [...],
    //    },
    //    ...
    //  ]
    const results = sessions
      .map(({ results: r = [] }) => r)
      .filter(r => r.length > 0);
    const resultsSmartCliqzClasses = results
      // flatten results across sessions
      .reduce((acc, cur) => acc.concat(cur), [])
      // only results containing SmartCliqz
      .filter(({ sources = [] }) => sources.includes('X'))
      // flatten classes
      .map(({ classes = [] }) => classes)
      .reduce((acc, cur) => acc.concat(cur), []);
    const resultsSmartCliqzCounter = new Counter(resultsSmartCliqzClasses);

    // selections (i.e., selected results) across sessions
    const selections = sessions.map(({ selection = [] }) => selection);
    const selectionsCliqz = selections.filter(s => s.origin === 'cliqz');
    const selectionsSmartCliqzClasses = selectionsCliqz
      // flatten selections across sessions
      .reduce((acc, cur) => acc.concat(cur), [])
      .filter(({ sources = [] }) => sources.includes('X'))
      // flatten classes
      .map(({ classes = [] }) => classes)
      .reduce((acc, cur) => acc.concat(cur), []);
    const selectionsSmartCliqzCounter = new Counter(selectionsSmartCliqzClasses);

    return [{
      results: {
        // count of all sessions with non-empty (last) results; note that
        // "Visit URL" and "Search on Google" count as results
        total: results.length,
        // counts of SmartCliqz classes
        class: resultsSmartCliqzCounter.size === 0
          ? {}
          : Object.assign(
            ...Array.from(resultsSmartCliqzCounter.entries()).map(([k, v]) => ({ [k]: v }))
          ),
      },
      // statistics on selections across sessions
      selections: {
        // count of all sessions with selections, which is the same as
        // count of all sessions with user input since 'abandoned' selections
        // are included (i.e., when the user closes the dropdown without
        // selecting a result)
        total: selections.length,
        // count of all sessions with a cliqz selection
        cliqz: selectionsCliqz.length,
        class: selectionsSmartCliqzCounter.size === 0
          ? {}
          : Object.assign(
            ...Array.from(selectionsSmartCliqzCounter.entries()).map(([k, v]) => ({ [k]: v }))
          ),
      },
    }];
  },
  schema: {
    required: ['results', 'selections'],
    properties: {
      results: {
        required: ['total', 'cliqz', 'class'],
        properties: {
          ...mkCountSchema('total'),
          ...mkCountSchema('cliqz'),
          class: {
            required: [],
            properties: {
              ...mkCountsSchema(RESULT_CLASSES)
            },
          },
        },
      },
      selections: {
        required: ['total', 'class'],
        properties: {
          ...mkCountSchema('total'),
          class: {
            required: [],
            properties: {
              ...mkCountsSchema(RESULT_CLASSES),
            },
          },
        },
      },
    },
  },

};
