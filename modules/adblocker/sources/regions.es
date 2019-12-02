/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Language from '../core/language';

import config from './config';
import logger from './logger';

const LANG_FACTOR = 20;

/**
 * Return a list of regions/languages enabled. These values come from
 * `core/language` and are based on locally stored statistics about browsing
 * habits (languages of websites visited). This allows to automatically enable
 * region-specific lists for the adblocker (e.g.: if a user visits German
 * website, then the 'german-filters' lists will be enabled). Alternatively,
 * these values can be overriden using the ADB_USER_LANG pref.
 */
export default function getEnabledRegions() {
  const langOverride = config.regionsOverride;

  // Check regions specified in prefs, if any.
  if (langOverride.length !== 0) {
    logger.log('Use regions override from prefs', langOverride);
    return langOverride;
  }

  // Check `Language` API to retrieve a list of languages.
  if (Language.state) {
    // The most used language is always loaded. For the rest, only if they reach
    // a proportion of the most used one.
    const userLang = [];
    const langDistribution = Language.state(true);
    logger.log('Got language state', langDistribution);
    // langDistribution: [['de', 0.001], ... ]

    if (langDistribution.length > 0) {
      // add most used language
      userLang.push(langDistribution[0][0]);
      const mostUsedScore = langDistribution[0][1];

      // check the rest
      langDistribution.shift(0);
      for (const [lang, score] of langDistribution) {
        if (score < mostUsedScore * LANG_FACTOR) {
          userLang.push(lang);
        }
      }
    }

    const filteredUserLang = userLang.filter(lang => lang !== 'en').slice(0, 3);
    logger.log('Use regions from Language API', filteredUserLang);
    return filteredUserLang;
  }

  logger.log('Use regions default: en');
  return [];
}
