import {
  DAY_FORMAT,
  WEEK_FORMAT,
  MONTH_FORMAT,
} from '../internals/synchronized-date';


const retentionSchema = {
  required: ['units_active', 'offset'],
  properties: {
    units_active: {
      type: 'integer', // 0 for inactive, 1 for active
      minimum: 0,
    },
    offset: {
      type: 'integer',
      minimum: 0,
    },
  },
};


function generateRetention(
  { state,
    date,
    timeframe,
    getPreviousUnit,
    initialOffset }
) {
  const getLength = offset => (state[getPreviousUnit(date, offset)] || []).length;

  const signals = [{
    offset: initialOffset,
    units_active: getLength(initialOffset),
  }];

  for (let i = 1; i < timeframe; i += 1) {
    signals.push({
      offset: i + initialOffset,
      units_active: getLength(1),
    });
  }

  return signals;
}


/**
 * Retention signals enable the analysis the retention of a group of people over
 * time, without allowing tracking of any individual in the group.
 *
 * All retention signals have the same schema, but should be interpreted on
 * different temporal scales (daily, weekly and monthly basis).
 */
export default [
  {
    name: 'retention-daily',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => generateRetention({
      state: retention.daily,
      date: dateMoment,
      timeframe: 10,
      getPreviousUnit: (d, offset) => d.subtract(offset, 'days').format(DAY_FORMAT),
      initialOffset: 0,
    }),
    schema: retentionSchema,
  },
  {
    name: 'retention-weekly',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => {
      // If this is not the first day we are active during this week, then we
      // should not generate retention signals again.
      const week = dateMoment.format(WEEK_FORMAT);
      if (retention.weekly[week].length !== 1) {
        return [];
      }

      return generateRetention({
        state: retention.weekly,
        date: dateMoment,
        timeframe: 10,
        getPreviousUnit: (d, offset) => d.subtract(offset, 'weeks').format(WEEK_FORMAT),
        initialOffset: 1,
      });
    },
    schema: retentionSchema,
  },
  {
    name: 'retention-monthly',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => {
      // If this is not the first week we are active during this month, then we
      // should not generate retention signals again.
      const month = dateMoment.format(MONTH_FORMAT);
      if (retention.monthly[month].length !== 1) {
        return [];
      }

      // If we reach this point, this means we were active only during one week
      // of this month, but we need to make sure we were active only one day of
      // this week.
      const week = retention.monthly[month][0];
      if (retention.weekly[week].length !== 1) {
        return [];
      }

      return generateRetention({
        state: retention.monthly,
        date: dateMoment,
        timeframe: 12,
        getPreviousUnit: (d, offset) => d.subtract(offset, 'months').format(MONTH_FORMAT),
        initialOffset: 1,
      });
    },
    schema: retentionSchema,
  },
];

export { generateRetention };
