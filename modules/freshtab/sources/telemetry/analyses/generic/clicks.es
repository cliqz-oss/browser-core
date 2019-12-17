/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// note: only including clicks on targets on the main freshtab view (e.g., not in settings view)
const clickMetricTargets = [
  // automatically added, most-visited sites (first row)
  'topsite',
  // manually added favorites (second row)
  'favorite',
  // 3 possible news types
  'breakingnews',
  'topnews',
  'yournews',
  // switch to history page (upper left)
  'history',
  // open settings (upper right)
  'settings',
  // adding and removing favorites
  'add_favorite',
  'edit_favorite',
  // rotating through news
  'news_pagination',
];

export default {
  name: 'freshtab.analysis.generic.clicks',
  description: 'How often did a user click on different freshtab targets on a day?',
  needsGid: true,
  version: 1,
  generate: ({ records }) => {
    let totalCount = 0;
    const targetCounts = {};

    clickMetricTargets.forEach((target) => {
      const targetMetrics = records.get(`freshtab.home.click.${target}`);

      if (targetMetrics.length > 0) {
        targetCounts[target] = targetMetrics.length;
        totalCount += targetMetrics.length;
      }
    });

    return [{
      total: totalCount,
      targets: targetCounts,
    }];
  },
  schema: {
    required: ['total', 'targets'],
    properties: {
      total: { type: 'integer', minimum: 0 },
      targets: Object.assign({},
        ...clickMetricTargets.map(target => ({ [target]: { type: 'integer', minimum: 0 } }))),
    },
  },
};
