import {
  WEEK_FORMAT,
  MONTH_FORMAT,
} from '../internals/synchronized-date';


/**
 * These three signals are used to measure the number of daily, weekly and
 * monthly active users. They do not encode any information about the retention,
 * or any other behavior. They are sent at most once a day, week, month
 * (respectively) as soon as possible.
 *
 * A bit more context about why retention signals are not enough:
 *
 * The issue with retention signals is that they are not sent straight away when
 * the user is active on a given day (except daily retention). Weekly retention
 * for week 1 will be sent on week 2, because we count the number of days the
 * user was active on week 1 (and counting requires us to wait for week 1 to be
 * over to send the signal). Similarly for monthly retention, the signal for
 * January will be sent only on February (if the user is active on February of
 * course), with the number of weeks the user was active during January. So this
 * active user signal is sent only once per day/week/month, as soon as possible,
 * with no other information than the fact the user was active that
 * day/week/month.
 */
export default [
  {
    name: 'daily-active',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: () => [{}],
    schema: {},
  },
  {
    name: 'weekly-active',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => {
      // Check if this is the first time we are active during this week.
      const week = dateMoment.format(WEEK_FORMAT);
      if (retention.weekly[week].length !== 1) {
        return [];
      }

      return [{}];
    },
    schema: {},
  },
  {
    name: 'monthly-active',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => {
      // Check if this is the first time we are active during this month.
      const month = dateMoment.format(MONTH_FORMAT);
      if (retention.monthly[month].length !== 1) {
        return [];
      }

      // This means we were active only during one week of this month, but we
      // need to make sure we were active only one day of this week.
      const week = retention.monthly[month][0];
      if (retention.weekly[week].length !== 1) {
        return [];
      }

      return [{}];
    },
    schema: {},
  },
];
