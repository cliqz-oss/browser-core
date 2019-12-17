/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class HistoryHelper {
  constructor(browser) {
    this.browser = browser;
  }

  async getDomains() {
    const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;
    const items = await this.browser.history.search({
      text: '',
      startTime: Date.now() - ONE_MONTH,
      endTime: Date.now(),
      maxResults: 1000
    });

    return items.map(item => ({
      last_visit_date: item.lastVisitTime * 1000, // it expects microseconds
      visit_count: item.visitCount,
      ...item,
    }));
  }

  async isURLVisited(url) {
    const visits = await this.browser.history.getVisits({ url });
    return visits.length > 0;
  }
}
