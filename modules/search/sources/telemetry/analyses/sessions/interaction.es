/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import integersToHistogram from '../../../../core/helpers/histogram';

import {
  isAutocompleteAction,
  isClickAction,
  isEnterAction,
  mapCliqzSources,
  mkActionSchema,
  mkCountSchema,
  mkHistogramSchema,
  mkSourceSchema,
} from '../../helpers';

export default {
  name: 'search.analysis.sessions.interaction',
  sendToBackend: {
    version: 3,
    demographics: [
      'campaign',
      'country',
      'install_date',
      'platform',
      'product',
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

    // selections (i.e., selected results) across sessions
    const selections = sessions.map(({ selection = [] }) => selection);

    // entry points of search sessions
    const entryPoints = sessions.reduce((acc, session) => {
      if (session.entryPoint) {
        acc[session.entryPoint] = (acc[session.entryPoint] || 0) + 1;
      }
      return acc;
    }, {});


    // sources of last results, mapped to history vs. backend
    const sources = results
    // flatten result sources per session
      .map(r => [].concat(...r.map(({ sources: s = [] }) => s)))
      .map(mapCliqzSources)
      .filter(
        ({
          hasOnlyHistorySources,
          hasOnlyBackendSources,
          hasMixedSources
        }) =>
          hasOnlyHistorySources
        || hasOnlyBackendSources
        || hasMixedSources
      );

    // selections by origin
    const selectionsCliqz = selections.filter(s => s.origin === 'cliqz');
    const selectionsDirect = selections.filter(s => s.origin === 'direct');
    const selectionsOther = selections.filter(s => s.origin === 'other');
    const selectionsAbandoned = selections.filter(s => s.origin === null);

    // sources of Cliqz selections, mapped to history vs. backend
    const selectionsCliqzSources = selectionsCliqz
      .map(({ sources: s = [] }) => mapCliqzSources(s));

    return [{
      // entry points of search sessions
      entryPoints,
      // highlight (swipe) counts across search sessions
      highlightCounts: integersToHistogram(
        sessions.map(({ highlightCount }) => highlightCount),
        { binSize: 1, binCount: 16 }
      ),
      // statistics on non-empty last results across sessions
      results: {
        // count of all sessions with non-empty (last) results; note that
        // "Visit URL" and "Search on Google" count as results
        total: results.length,
        // statistics on last results split by origin
        origin: {
          cliqz: {
            // count of sessions with last results that contain some Cliqz
            // results; note: might contain other results as well
            total: sources.length,
            // count of sessions with last results that contain Cliqz
            // results split by source
            source: {
              // count of sessions with last results that contain Cliqz
              // results from history only
              history: sources.filter(({ hasOnlyHistorySources }) =>
                hasOnlyHistorySources).length,
              // count of sessions with last results that contain Cliqz
              // results from backend only
              backend: sources.filter(({ hasOnlyBackendSources }) =>
                hasOnlyBackendSources).length,
              // count of sessions with last results that contain Cliqz
              // results from both history and backend
              mixed: sources.filter(({ hasMixedSources }) =>
                hasMixedSources).length,
            }
          },
          // to get the number of sessions without any Cliqz results subtract
          // the sum of history, backend, and mixed from the total count
        },
      },
      // statistics on selections across sessions
      selections: {
        // count of all sessions with selections, which is the same as
        // count of all sessions with user input since 'abandoned' selections
        // are included (i.e., when the user closes the dropdown without
        // selecting a result)
        total: selections.length,
        // histogram of selected indices
        index: integersToHistogram(
          selections.map(({ index }) => index),
          { binSize: 1, binCount: 16 }
        ),
        // histogram of query lengths at time of selection
        queryLength: integersToHistogram(
          selections.map(({ queryLength }) => queryLength),
          { binSize: 1, binCount: 32 }
        ),
        // statistics on selections split by origin; note: origins are
        // mutually exclusive and collectively exhaustive
        origin: {
          cliqz: {
            // count of sessions where users selected a Cliqz result
            total: selectionsCliqz.length,
            // count of sessions with Cliqz result split by action
            action: {
              autocomplete: selectionsCliqz
                .filter(isAutocompleteAction).length,
              click: selectionsCliqz.filter(isClickAction).length,
              enter: selectionsCliqz.filter(isEnterAction).length,
            },
            // count of sessions with Cliqz result split by source
            source: {
              history: selectionsCliqzSources
                .filter(({ hasOnlyHistorySources }) => hasOnlyHistorySources)
                .length,
              backend: selectionsCliqzSources
                .filter(({ hasOnlyBackendSources }) => hasOnlyBackendSources)
                .length,
              mixed: selectionsCliqzSources
                .filter(({ hasMixedSources }) => hasMixedSources)
                .length,
            },
          },
          direct: {
            // count of sessions where users typed a full URL
            total: selectionsDirect.length,
            // count of sessions with URL result split by action
            action: {
              click: selectionsDirect.filter(isClickAction).length,
              enter: selectionsDirect.filter(isEnterAction).length,
            },
          },
          other: {
            // count of sessions where users used the default search engine
            total: selectionsOther.length,
            action: {
              // count of sessions with search engine result split by action
              click: selectionsOther.filter(isClickAction).length,
              enter: selectionsOther.filter(isEnterAction).length,
            },
          },
          abandoned: {
            // count of sessions where users closed the dropdown without
            // selecting a result
            total: selectionsAbandoned.length,
            // time (in s) from last results shown to dropdown close
            showTime: integersToHistogram(
              selectionsAbandoned
                .map(({ showTime }) => Math.round(showTime / 1000),
                  { binSize: 1, binCount: 10 })
            ),
          },
        },
      },
    }];
  },
  schema: {
    required: [],
    properties: {
      entryPoints: {
        required: [],
        properties: {
          newTab: { type: 'integer', minimum: 0 },
          browserBar: { type: 'integer', minimum: 0 },
          overlayByKeyboard: { type: 'integer', minimum: 0 },
          overlayByMouse: { type: 'integer', minimum: 0 },
          overlayByContextMenu: { type: 'integer', minimum: 0 },
        }
      },
      highlightCounts: { ...mkHistogramSchema(16) },
      results: {
        required: [],
        properties: {
          ...mkCountSchema('total'),
          origin: {
            required: [],
            properties: {
              cliqz: {
                required: [],
                properties: {
                  ...mkCountSchema('total'),
                  ...mkSourceSchema(),
                },
              },
            }
          },
        },
      },
      selections: {
        required: [],
        properties: {
          ...mkCountSchema('total'),
          index: { ...mkHistogramSchema(16) },
          queryLength: { ...mkHistogramSchema(32) },
          origin: {
            required: [],
            properties: {
              ...mkCountSchema('total'),
              cliqz: {
                required: [],
                properties: {
                  ...mkCountSchema('total'),
                  ...mkActionSchema(['autocomplete']),
                  ...mkSourceSchema(),
                },
              },
              direct: {
                required: [],
                properties: {
                  ...mkCountSchema('total'),
                  ...mkActionSchema(),
                },
              },
              other: {
                required: [],
                properties: {
                  ...mkCountSchema('total'),
                  ...mkActionSchema(),
                },
              },
              abandoned: {
                required: [],
                properties: {
                  ...mkCountSchema('total'),
                  showTime: { ...mkHistogramSchema(10) },
                },
              },
            },
          },
        },
      },
    },
  },
};
