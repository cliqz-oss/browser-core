/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  SELECTION_ACTIONS,
  SELECTION_ELEMENTS,
  SELECTION_ORIGINS,
  SELECTION_SUB_RESULT_TYPES,
  mkResultSchema,
} from '../../helpers';

export default {
  // A search session starts when the user indicates they want to start a new
  // search. On desktop, this is on URL bar focus. The session ends when the
  // user selected a result or abandoned the search. On desktop, this is on
  // URL bar blur; any result selection is included in the session as it
  // happens before the blur.
  //
  // Note: This is a metric. It is generally not sent to the backend directly
  // but it is aggregated in the corresponding 'search.analysis.sessions.interaction' analysis.
  name: 'search.metric.session.interaction',
  schema: {
    required: ['version', 'hasUserInput', 'results'],
    properties: {
      // Signal version
      version: { type: 'integer', value: 3 },
      // True, if the user typed or pasted any characters
      hasUserInput: { type: 'boolean' },
      // One of the following possible search entry points:
      // - newTab: search started on new tab
      // - browserBar: search started in URL bar
      // - overlayByKeyboard: search started in overlay (using keyboard)
      // - overlayByMouse: search started in overlay (using mouse)
      entryPoint: { type: 'string',
        enum: ['newTab', 'browserBar', 'overlayByKeyboard', 'overlayByMouse'] },
      // Number of times the user highlighted (desktop) or swiped to a
      // result (mobile).
      highlightCount: { type: 'integer', minimum: 0 },
      // List of last results shown before making a selection or abandoning
      // the search. Empty if no results were shown. Each item corresponds to
      // one result. On desktop, this is one row in the dropdown. On mobile,
      // this is one card. Information per item:
      // - sources: sources of results that got mixed together for this item,
      //            using one-letter codes such as 'C' or 'm' (see above)
      // - classes: classes of results that got mixed together for this item,
      //            like 'EntityGeneric' or 'EntityWeather' (see above)
      results: {
        type: 'array',
        items: {
          type: 'object',
          required: [],
          properties: {
            ...mkResultSchema(),
          },
        },
      },
      // The selected result. If the user did not select a result (i.e.,
      // abandoned the search), the following values are not set.
      selection: {
        required: [],
        properties: {
          // How did the user select the result?
          // - click: using the mouse or the finger (on mobile)
          // - enter: using the keyboard
          action: { type: 'string', enum: SELECTION_ACTIONS },
          // What part of the result did the user click on? See above for
          // possible values, such as title or logo.
          element: { type: 'string', enum: SELECTION_ELEMENTS },
          // Which result did the user select? The first result has index 0.
          index: { type: 'integer', minimum: 0 },
          // True, if the user pressed enter for an autocompleted result.
          isAutocomplete: { type: 'boolean' },
          // Same schema as above for results: includes sources and classes.
          ...mkResultSchema(),
          // Where did the selected result come from?
          // - cliqz: from the Cliqz backend or history
          // - direct: the user entered a complete URL
          // - other: the user chose the complimentary search engine
          origin: { enum: SELECTION_ORIGINS },
          // The query length at the time of selection.
          queryLength: { type: 'integer', minimum: 0 },
          // TODO: could be moved to `results`
          // How long was the last result shown for (in ms) before the user
          // selected a result or abandoned the search?
          showTime: { type: 'integer', minimum: 0 },
          // The sub result type. See above for possible values.
          subResult: {
            required: [],
            properties: {
              type: { type: 'string', enum: SELECTION_SUB_RESULT_TYPES },
              index: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    },
  },
};
