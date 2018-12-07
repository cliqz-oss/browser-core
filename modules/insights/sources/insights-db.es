import getDexie from '../platform/lib/dexie';
import moment from '../platform/lib/moment';
import logger from './logger';

const DATE_FORMAT = 'YYYY-MM-DD';

function mergeStats(_a, b) {
  const a = _a;
  Object.keys(b).forEach((key) => {
    if (key === 'day') {
      a[key] = a[key] > b[key] ? a[key] : b[key];
    } else if (key === 'trackers') {
      a[key] = [...new Set((a[key] || []).concat([...b[key]]))];
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
    this.db.version(1).stores({
      daily: 'day',
    });
  }

  async insertPageStats(counters) {
    const today = moment().format(DATE_FORMAT);
    await this.db.transaction('rw', this.db.daily, async () => {
      const stats = (await this.db.daily.get(today)) || { day: today };
      mergeStats(stats, counters);
      mergeStats(stats, { pages: 1 });
      logger.debug('Aggregated stats for day:', stats);
      await this.db.daily.put(stats);
    });
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

  getStatsForDay(day) {
    return this.db.daily.get(moment(day).format(DATE_FORMAT));
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
