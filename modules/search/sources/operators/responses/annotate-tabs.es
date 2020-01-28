/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Returns an operator that, given both a history and a tabs provider
 * response, annotates all history links that are also open in a tab (i.e.,
 * history links that are also present in the tabs provider response).
 *
 * This operator is for iOS and web-extension-based products. Unlike on
 * desktop, the history provider on iOS etc. does not return currently open
 * tabs. To implement a switch-to-tab function on iOS etc., the browser needs
 * to know which of the history URLs are currently open in a tab. This is what
 * this operator is for.
 *
 * On desktop, this operator will not have any effect as the tabs provider is
 * not enabled, thus not emitting results.
 *
 * Note: After history links have been annotated using this operator, all tabs
 * provider results should be discarded. In theory, they could be kept, but we
 * would then need to make sure that there are no duplicates.
 *
 * The following alternatives were considered:
 *
 * - Deduplicate tabs with backend provider, then backend with history
 * provider. This would be a more wholistic solution, but would introduce
 * additional complexity. On top, the additional benefit is not clear: all
 * open tabs occur by definition in history (we don't offer switch-to-tab for
 * private/forget tabs).
 *
 * - Mixing of history and tab results. This would require to define a ranking
 * function to determine the order of history and tabs results, which is not
 * trivial
 *
 * @param {Object} historyResponse The tabs provider response.
 * @param {Object} tabsResponse The history provider response.
 * @return {Object} The annotated history response.
 */
export default ([historyResponse, tabsResponse]) => {
  // Collect all URLs from tabs provider
  const tabUrls = new Set();
  for (const result of tabsResponse.results) {
    for (const link of result.links) {
      tabUrls.add(link.url);
    }
  }

  // Annotate history URLs that were also found in tabs provider
  return {
    ...historyResponse,
    results: historyResponse.results.map(result => ({
      ...result,
      links: result.links.map((link) => {
        if (!tabUrls.has(link.url)) {
          return link;
        }
        return {
          ...link,
          style: 'action switchtab',
          type: 'action switchtab',
        };
      }),
    }))
  };
};
