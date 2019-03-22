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
    this.db.version(2).stores({
      daily: 'day',
      search: 'day',
    });
    // Always keep the declarations previous versions
    // as long as there might be users having them running.
    this.db.version(1).stores({
      daily: 'day',
    });
  }

  unload() {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }

  async insertStats(table, counters) {
    const today = moment().format(DATE_FORMAT);
    await this.db.transaction('rw', this.db[table], async () => {
      const stats = (await this.db[table].get(today)) || { day: today };
      mergeStats(stats, counters);
      if (table === 'daily') {
        mergeStats(stats, { pages: 1 });
      }
      logger.debug('Aggregated stats for day:', stats);
      await this.db[table].put(stats);
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
