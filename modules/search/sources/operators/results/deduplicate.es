/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { hasMainLink } from '../links/utils';


/**
  Removes duplicate URL within a results. For example, to remove
  the same URL occuring once with http and once with https.
*/
export default (results) => {
  const urls = new Map();

  return results
    .map(({ links, ...result }) => ({
      ...result,
      links: links.filter(({ meta: { url } }) => {
        const isDuplicate = urls.has(url);
        urls.set(url);
        return !isDuplicate;
      }),
    }))
    // remove results without 'main' link
    .filter(hasMainLink);
};
