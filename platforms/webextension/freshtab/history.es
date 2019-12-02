/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { browser, chrome } from '../globals';

const CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {object} options
   * @param {number} options.limit maximum number of top sites retrieved
   * @param {array<string>} options.exclude array of urls to be excluded from the list
   * @param {boolean} options.includeAdult are adult sites allowed in the list
   * @returns {array} Array of objects { url, title }
   */
  getTopUrls({
    limit = 15,
    exclude = [],
    includeAdult = false,
  } = {}) {
    if (browser.cliqzHistory) {
      return browser.cliqzHistory.topDomains({ limit, exclude, includeAdult });
    }

    return new Promise(resolve => chrome.topSites.get((sites) => {
      const excludeUrls = new Set(exclude);
      const topSites = [];
      for (let i = 0, l = 0; i < sites.length && l < limit; i += 1) {
        const site = sites[i];
        if (!excludeUrls.has(site.url)) {
          topSites.push({
            ...site,
            // Note that in any browser other than Cliqz `isAdult` is always `false`
            // as we cannot tell adult site from a regular one there.
            isAdult: false,
          });
          l += 1;
        }
      }
      resolve(topSites);
    }));
  }
};

export function getDomains() {
  const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;
  return new Promise(resolve =>
    chrome.history.search({
      text: '',
      startTime: Date.now() - ONE_MONTH,
      endTime: Date.now(),
      maxResults: 1000
    }, items => resolve(
      items.map(item => ({
        last_visit_date: item.lastVisitTime * 1000, // it expects microseconds
        visit_count: item.visitCount,
        ...item
      }))
    )));
}

export function isURLVisited(url) {
  return new Promise(resolve =>
    chrome.history
      .getVisits({ url }, visits => resolve(visits.length > 0)));
}

export default CliqzFreshTabHistory;
