/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { RESULT_SOURCE_MAP } from '../telemetry/helpers';

export const COLORS = {
  history: '990099',
  backend: '009900',
  cliqz: '009900',
  instant: 'ee2200',
  'default-search': 'ee2200',
};

export const COLOR_MAP = Object.keys(RESULT_SOURCE_MAP)
  .reduce((acc, p) => {
    const kinds = Object.keys(RESULT_SOURCE_MAP[p])
      .reduce((acc2, k) => {
        /* eslint-disable no-param-reassign */
        acc2[k] = {
          name: RESULT_SOURCE_MAP[p][k],
          kind: k,
          provider: p,
          color: COLORS[p] || '333333'
        };
        /* eslint-enable no-param-reassign */

        return acc2;
      }, {});


    return { ...acc, ...kinds };
  }, {});

export const IMAGE_PATHS = [
  ['extra', 'og', 'image'],
  ['extra', 'image', 'src'],
  ['extra', 'image'],
  ['data', 'deepResults', 0, 'links', 0, 'image'],
  ['data', 'extra', 'og', 'image'],
  ['data', 'extra', 'image', 'src'],
];

export const IGNORED_PROVIDERS = ['richHeader', 'cliqz::offers', 'querySuggestions', 'historyView', 'calculator', 'cliqz::snippets'];
