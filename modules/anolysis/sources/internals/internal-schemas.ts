/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Records } from './records';
import { Schema } from './schema';

const ACTIONS = ['click', 'show', 'hover', 'scroll', 'swipe'] as const;

type Action = typeof ACTIONS;

interface Interaction {
  component: string;
  action: Action;
  view?: string;
  target?: string;
  count: number;
}

export default [
  /**
   * This metric can be emitted when an internal exception is raised in
   * Anolysis. It is sent with a general context information (e.g.: 'storage')
   * as well as the kind of exception which happened (e.g.: `TypeError: Cannot read ...`).
   */
  {
    name: 'metrics.anolysis.health.exception',
    description: 'emitted when internal storage cannot be initialized',
    sendToBackend: {
      version: 2,
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 1,
      },
      demographics: ['install_date', 'product', 'extension', 'browser', 'os'],
    },
    schema: {
      required: ['context', 'exception'],
      properties: {
        context: { type: 'string', enum: ['storage'] },
        exception: { type: 'string' },
        autoPrivateMode: { type: 'boolean' },
      },
    },
  } as Schema,
  {
    name: 'metrics.anolysis.health.storage',
    description: 'emitted when internal storage cannot be initialized',
    sendToBackend: {
      version: 2,
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 1,
      },
      demographics: ['install_date', 'product', 'extension', 'browser', 'os'],
    },
    schema: {
      properties: {
        autoPrivateMode: { type: 'boolean' },
        state: {
          type: 'string',
          enum: ['broken', 'recovered', 'could_not_recover'],
        },
      },
    },
  } as Schema,
  /**
   * Generic interactions
   */
  {
    name: 'ui.metric.interaction',
    description: 'Generic interaction metrics',
    schema: {
      required: ['component', 'action'],
      type: 'object',
      properties: {
        component: { type: 'string' },
        view: { type: 'string' },
        target: { type: 'string' },
        action: { type: 'string', enum: ACTIONS },
      },
    },
  } as Schema,
  {
    name: 'ui.analysis.interaction',
    description: 'Generic interaction metrics',
    sendToBackend: {
      version: 1,
      demographics: ['product', 'extension', 'browser'],
    },
    metrics: ['ui.metric.interaction'],
    generate: async ({
      records,
    }: {
      records: Records;
    }): Promise<Interaction[][]> => {
      // Aggregate all freshtab signals per `type`, `action`, `view`, and `target`.
      const counter: Map<string, number> = new Map();
      const metrics: {
        component: string;
        view?: string;
        target?: string;
        action: Action;
      }[] = records.get('ui.metric.interaction');

      for (const { component, view, target, action } of metrics) {
        const key = `${component}.${view}.${target}.${action}`;
        counter.set(key, (counter.get(key) || 0) + 1);
      }

      if (counter.size === 0) {
        return [];
      }

      // Create final summary with all counts
      const aggregation: Interaction[] = [];

      for (const [key, count] of counter.entries()) {
        const [component, view, target, action] = key.split('.');
        const signal: Interaction = {
          count,
          component,
          action: (action as unknown) as Action,
        };

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
        required: ['component', 'action', 'count'],
        type: 'object',
        properties: {
          component: { type: 'string' },
          action: { type: 'string', enum: ACTIONS },
          view: { type: 'string' },
          target: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
        },
      },
    },
  } as Schema,
];
