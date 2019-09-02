/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { isValidUrl } from '../../core/search-engines';

/*
 * Removes search engine results.
 *
 * @param {Object} result - The result.
 */
export default function clean({ links, ...result }) {
  return {
    ...result,
    links: links.filter(({ template, url }) => template === 'sessions'
      || isValidUrl(url)),
  };
}
