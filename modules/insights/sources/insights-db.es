/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import getDexie from '../platform/lib/dexie';
import moment from '../platform/lib/moment';
import logger from './logger';

const DATE_FORMAT = 'YYYY-MM-DD';

export function mergeStats(_a, b) {
  const a = _a;
  Object.keys(b).forEach((key) => {
    if (key === 'day') {
      a[key] = a[key] > b[key] ? a[key] : b[key];
    } else if (key === 'trackers') {
      a[key] = [...new Set(
        [
          ...(a[key] || []),
          ...(b[key] || [])
        ]
      )];
    } else {
      a[key] = (a[key] || 0) + b[key];
    }
  });
  return a;
}

export default class InsightsDb {
  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('insights');
    this.db.version(3).stores({
      daily: 'day',
      search: 'day',
      tabs: 'tabId'
    });
    this.db.version(2).stores({
      daily: 'day',
      search: 'day',
    });
    // Always keep the declarations previous versions
    // as long as there might be users having them running.
    this.db.version(1).stores({
      daily: 'day',
    });

    // migrate staged tabs (from the last session) to daily stats
    const stagedTabs = await this.db.tabs.toArray();
    await this.db.transaction('rw', [this.db.daily, this.db.tabs], async () => {
      stagedTabs.forEach(async ({ tabId, ...counters }) => {
        await this.insertStats('daily', counters, counters.day);
        await this.db.tabs.delete(tabId);
      });
    });
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  async insertStats(table, counters, date = undefined) {
    const day = moment(date).format(DATE_FORMAT);
    await this.db.transaction('rw', this.db[table], async () => {
      const stats = (await this.db[table].get(day)) || { day };
      mergeStats(stats, counters);
      if (table === 'daily') {
        mergeStats(stats, { pages: 1 });
      }
      logger.debug('Aggregated stats for day:', stats);
      await this.db[table].put(stats);
    });
  }

  async insertPageStats(tabId, counters) {
    return this.db.transaction('rw', [this.db.daily, this.db.tabs], async () => {
      this.db.tabs.delete(tabId);
      return this.insertStats('daily', counters);
    });
  }

  /**
   * Stage stats for a tab: save current state of stats so that on browser close then can be later
   * added to the daily stats
   * @param tabId
   * @param counters
   */
  stagePageStats(tabId, counters) {
    return this.db.tabs.put({
      tabId,
      day: moment().format(DATE_FORMAT),
      ...counters,
    });
  }

  async getSearchStats() {
    const days = await this.db.search.toArray();
    return days.reduce(mergeStats, {});
  }

  async getDashboardStats(period) {
    if (period === 'day') {
      return this.getStatsForDay();
    }
    let days = [];
    if (period === 'week') {
      days = await this.getStatsTimeline(
        moment().subtract(7, 'days'), moment(), true, true
      );
    } else if (period === 'month') {
      days = await this.getStatsTimeline(
        moment().subtract(30, 'days'), moment(), true, true
      );
    } else {
      days = await this.db.daily.toArray();
    }
    return days.reduce(mergeStats, {});
  }

  async getStatsForDay(day) {
    return (await this.db.daily.get(moment(day).format(DATE_FORMAT))) || { day };
  }

  getStatsTimeline(from, to, includeFrom = true, includeTo = false) {
    return this.db.daily.where('day').between(
      moment(from).format(DATE_FORMAT),
      moment(to).format(DATE_FORMAT),
      includeFrom,
      includeTo
    ).toArray();
  }

  getAllDays() {
    return this.db.daily.orderBy('day').keys();
  }

  async clearData() {
    return this.db.daily.toCollection().delete();
  }
}
