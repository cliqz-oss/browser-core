/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from '../internals/logger';
import prefs from '../../core/prefs';


function parseABTest(abtest) {
  const [id, group] = abtest.split('_');
  return {
    id: parseInt(id, 10),
    group,
  };
}


function parseABTests(abtests) {
  if (typeof abtests !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(abtests);
    if (Array.isArray(parsed)) {
      return parsed.map(parseABTest);
    }
    return Object.keys(parsed).map(parseABTest);
  } catch (ex) {
    logger.error('while parsing abtests', ex);
  }

  return [];
}

/** This metric will be called once a day to register the current ABTests a user
 * belongs to. This information can then be used by other analyses to analyze
 * the behavior of different ABTest groups.
 */
export default {
  name: 'metrics.core.abtests',
  offsets: [0],
  generate: () => [parseABTests(prefs.get('ABTests'))],
  schema: {
    type: 'array',
    items: { type: 'object' },
  },
};
