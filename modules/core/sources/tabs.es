/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getUrlVariations } from './url';
import { openedURLs } from '../platform/history/search';

export * from '../platform/tabs';

export function hasOpenedTabWithUrl(url, { strict = true } = {}) {
  if (strict) {
    return openedURLs.has(url);
  }
  return getUrlVariations(url).some(u => openedURLs.has(u));
}
