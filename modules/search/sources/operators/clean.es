/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { shouldAppearInDropdown } from '../../core/search-engines';

/*
 * Removes search engine results.
 *
 * NOTE: `unsafeClean` can mutate its argument (hence the 'unsafe' prefix). In
 * some contexts it is safe to use and will prevent extra copies (e.g.: search
 * providers are a place where this can be used since results have not be
 * shared/dispatched with consumers of streams yet; this is akin to exposing a
 * "pure" API while allowing some internal mutation to take place before results
 * are returned).
 */
export function unsafeClean(response) {
  response.links = response.links.filter(({ template, url }) => (
    template === 'sessions' || shouldAppearInDropdown(url)
  ));
  return response;
}

export default function (response) {
  return unsafeClean({ ...response });
}
