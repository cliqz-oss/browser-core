/* eslint-disable no-param-reassign */

import moment from 'platform/moment';
import getSynchronizedDate, {
  DATE_FORMAT,
  DAY_FORMAT,
  WEEK_FORMAT,
  MONTH_FORMAT } from 'anolysis/synchronized-date';


/**
 *
 *
 */
function generateRetention({
    state,
    date,
    timeframe,
    schema,
    getPreviousUnit,
    initialOffset }) {
  const getLength = offset => (state[getPreviousUnit(date, offset)] || []).length;

  const signals = [{
    offset: initialOffset,
    units_active: getLength(initialOffset),
  }];

  for (let i = 1; i < timeframe; i += 1) {
    signals.push({
      units_active: getLength(1),
      offset: i + initialOffset,
    });
  }

  // Decorate each signal with its schema name (eg: retention_daily)
  return signals.map(signal => [schema, signal]);
}


export function generateDailyRetention(state, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentDay = date.format(DAY_FORMAT);

  if (state[currentDay] === undefined) {
    state[currentDay] = [formattedDate];

    return generateRetention({
      state,
      date,
      timeframe: 10,
      schema: 'retention_daily',
      getPreviousUnit: (d, offset) => d.subtract(offset, 'days').format(DAY_FORMAT),
      initialOffset: 0,
    });
  }

  return [];
}


export function generateWeeklyRetention(state, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentWeek = date.format(WEEK_FORMAT);

  if (state[currentWeek] === undefined) {
    state[currentWeek] = [formattedDate];

    return generateRetention({
      state,
      date,
      timeframe: 10,
      schema: 'retention_weekly',
      getPreviousUnit: (d, offset) => d.subtract(offset, 'weeks').format(WEEK_FORMAT),
      initialOffset: 1,
    });
  } else if (state[currentWeek].indexOf(formattedDate) === -1) {
    state[currentWeek].push(formattedDate);
  }

  return [];
}


export function generateMonthlyRetention(state, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentWeek = date.format(WEEK_FORMAT);
  const currentMonth = date.format(MONTH_FORMAT);

  if (state[currentMonth] === undefined) {
    state[currentMonth] = [currentWeek];

    return generateRetention({
      state,
      date,
      timeframe: 12,
      schema: 'retention_monthly',
      getPreviousUnit: (d, offset) => d.subtract(offset, 'months').format(MONTH_FORMAT),
      initialOffset: 1,
    });
  } else if (state[currentMonth].indexOf(currentWeek) === -1) {
    state[currentMonth].push(currentWeek);
  }

  return [];
}


export default function generateRetentionSignals(retentionState) {
  const date = getSynchronizedDate();
  const formattedDate = date.format(DATE_FORMAT);
  const signals = [];

  // Generate all kinds of retentions.
  [
    ['daily', generateDailyRetention],
    ['weekly', generateWeeklyRetention],
    ['monthly', generateMonthlyRetention],
  ].forEach(([name, generator]) => {
    const state = retentionState[name] || {};
    generator(state, formattedDate).forEach((signal) => { signals.push(signal); });
    retentionState[name] = state;
  });

  return signals;
}
