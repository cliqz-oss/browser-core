/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { mkFreshtabSchema } from './schemas';

// From: https://stackoverflow.com/a/43053803
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

export const NEWS_EDITIONS = [
  'de',
  'de-tr-en',
  'es',
  'fr',
  'gb',
  'intl',
  'it',
  'us',
];

export default [
  // The following schemas are generated using a helper function, since they
  // all have a similar structure. A call of the function `mkFreshtabSchema`
  // such as:
  //
  //  mkFreshtabSchema({
  //    type: 'home',
  //    action: 'show',
  //    index: 0,
  //  })
  //
  //  Will result in the JSON schema:
  //
  //  {
  //    properties: {
  //      type: { type: 'string', enum: ['home'] },
  //      action: { type: 'string', enum: ['action'] },
  //      index: { type: 'number' },
  //    },
  //  }
  //
  //  This means that the only thing you need to do to generate the JSON schema
  //  is to provide an example of signal. This works assuming the other signals
  //  will have the same structure.
  //
  //  Last but not least, the name of the schema is automatically derived in the
  //  following way from the keys: 'type', 'action', 'target'. For example, the
  //  name for the following metric:
  //
  //  {
  //    type: 'home',
  //    action: 'click',
  //    target: 'topnews',
  //    index: 0,
  //  }
  //
  //  Would be: 'freshtab.home.click.topnews'
  //             ^        ^    ^     ^ target
  //             |        |    | action
  //             |        | type
  //             | prefix for all freshtab metrics

  mkFreshtabSchema({
    type: 'home',
    action: 'show',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'blur',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'focus',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'hide',
  }),

  // Settings button
  // ===============
  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'settings',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'close',
    view: 'settings',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'news_language',
    view: 'settings',
    state: { enum: NEWS_EDITIONS },
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'background_image',
    view: 'settings',
    state: { type: 'string' },
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'view_browser_prefs',
    view: 'settings',
  }),

  ...[
    'background',
    'cliqz_theme',
    'favorites',
    'news',
    'search_bar',
    'stats',
    'topsites',
  ].map(target => mkFreshtabSchema({
    type: 'home',
    action: 'click',
    view: 'settings',
    target,
    state: { type: 'string', enum: ['on', 'off'] },
  })),

  // History button
  // ==============
  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'history',
  }),

  // Top Sites
  // =========
  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'topsite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'delete_topsite',
    index: 0,
  }),

  // Favorites
  // =========
  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'favorite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'add_favorite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'close',
    view: 'add_favorite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'add',
    view: 'add_favorite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'edit_favorite',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    view: 'edit_favorite',
    target: 'save',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    view: 'edit_favorite',
    target: 'close',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    view: 'edit_favorite',
    target: 'delete',
    index: 0,
  }),

  // Search bar
  // ==========
  mkFreshtabSchema({
    type: 'home',
    action: 'focus',
    target: 'search_bar',
  }),

  mkFreshtabSchema({
    type: 'home',
    action: 'blur',
    target: 'search_bar',
  }),

  // Statistics
  // ==========
  mkFreshtabSchema({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'card',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    view: 'stats',
    action: 'hover',
    target: 'card',
    index: 0,
  }),

  mkFreshtabSchema({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'download',
  }),

  // Onboarding v3
  // =============
  mkFreshtabSchema({
    type: 'onboarding',
    view: 'intro',
    action: 'show',
    target: 'page',
  }),

  mkFreshtabSchema({
    type: 'onboarding',
    view: 'intro',
    action: 'click',
    target: 'share-data-btn',
  }),

  mkFreshtabSchema({
    type: 'onboarding',
    view: 'intro',
    action: 'click',
    target: 'start',
  }),

  // Offrz
  // =====
  mkFreshtabSchema({
    type: 'offrz',
    view: 'box',
    action: 'show_offer',
  }),

  mkFreshtabSchema({
    type: 'offrz',
    view: 'box',
    action: 'show',
  }),

  ...[
    'menu',
    'why',
    'learn_more',
    'product_logo',
    'general_feedback',
    'use',
    'close',
  ].map(target => mkFreshtabSchema({
    action: 'click',
    target,
    type: 'offrz',
    view: 'box',
  })),

  // News
  // ====
  mkFreshtabSchema({
    type: 'home',
    action: 'click',
    target: 'news_pagination',
    index: 0,
  }),

  // Generate all possible combinations of schemas for interactions with news:
  ...cartesian(
    ['click', 'hover'], // action
    ['topnews', 'breakingnews', 'yournews'], // target
  ).map(([action, target]) => mkFreshtabSchema({
    type: 'home',
    action,
    target,
    index: 0,
    edition: {
      type: 'string',
      enum: NEWS_EDITIONS,
    },
  })),
];
