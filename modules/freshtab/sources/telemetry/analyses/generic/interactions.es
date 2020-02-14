/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-continue */

import Counter from '../../../../core/helpers/counter';
import cartesian from '../../../../core/helpers/cartesian';

import { mkFreshtabSchemaName } from '../../schemas';

const AGGREGATED_TYPES = new Set([
  'home',
]);

const AGGREGATED_ACTIONS = new Set([
  'click',
  'show',
]);

const AGGREGATED_VIEWS = new Set([
  undefined,
  'settings',
  'add_favorite',
  'edit_favorite',
  'stats',
  'intro',
  'notification',
]);

const AGGREGATED_TARGETS = new Set([
  undefined,
  'add_favorite',
  'breakingnews',
  'close',
  'edit_favorite',
  'favorite',
  'history',
  'news_pagination',
  'settings',
  'topnews',
  'topsite',
  'yournews',
]);

export default {
  name: 'freshtab.analysis.interactions',
  description: 'Statistics about interactions on CliqzTab during a day',
  sendToBackend: {
    version: 1,
    demographics: [
      'product',
      'extension',
      'browser',
    ],
  },
  metrics: cartesian(
    [...AGGREGATED_TYPES],
    [...AGGREGATED_ACTIONS],
    [...AGGREGATED_VIEWS],
    [...AGGREGATED_TARGETS],
  ).map(([type, action, view, target]) => mkFreshtabSchemaName({
    type, action, view, target,
  })),
  generate: ({ records }) => {
    // Aggregate all freshtab signals per `type`, `action`, `view`, and `target`.
    const counter = new Counter();
    for (const [name, signals] of records.entries()) {
      if (name.startsWith('freshtab.')) {
        for (const { type, action, view, target } of signals) {
          // Skip *types* we are not interested in.
          if (AGGREGATED_TYPES.has(type) === false) {
            continue;
          }

          // Skip *actions* we are not interested in.
          if (AGGREGATED_ACTIONS.has(action) === false) {
            continue;
          }

          // Skip *views* we are not interested in.
          if (AGGREGATED_VIEWS.has(view) === false) {
            continue;
          }

          // Skip *targets* we are not interested in.
          if (AGGREGATED_TARGETS.has(target) === false) {
            continue;
          }

          counter.incr(`${type}.${action}.${view}.${target}`);
        }
      }
    }

    if (counter.size === 0) {
      return [];
    }

    // Create final summary with all counts
    const aggregation = [];
    for (const [key, count] of counter.entries()) {
      const [type, action, view, target] = key.split(/[.]/g);
      const signal = { count, type, action };

      if (view !== 'undefined') {
        signal.view = view;
      }

      if (target !== 'undefined') {
        signal.target = target;
      }

      aggregation.push(signal);
    }

    return [aggregation];
  },
  schema: {
    type: 'array',
    items: {
      additionalProperties: false,
      required: ['type', 'action', 'count'],
      type: 'object',
      properties: {
        type: { enum: [...AGGREGATED_TYPES] },
        action: { enum: [...AGGREGATED_ACTIONS] },
        view: { enum: [...AGGREGATED_VIEWS] },
        target: { enum: [...AGGREGATED_TARGETS] },
        count: { type: 'integer', minimum: 0 },
      },
    },
  },
};
