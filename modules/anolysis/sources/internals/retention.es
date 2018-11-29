/* eslint-disable no-param-reassign */

import moment from '../../platform/lib/moment';

import getSynchronizedDate, {
  DATE_FORMAT,
  DAY_FORMAT,
  WEEK_FORMAT,
  MONTH_FORMAT,
} from './synchronized-date';
import logger from './logger';


export function updateDailyRetention(state = {}, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentDay = date.format(DAY_FORMAT);
  logger.debug('Update retention daily for:', currentDay);

  if (state[currentDay] === undefined) {
    state[currentDay] = [formattedDate];
  }

  return state;
}


export function updateWeeklyRetention(state = {}, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentWeek = date.format(WEEK_FORMAT);
  logger.debug('Update retention weekly for:', currentWeek);

  if (state[currentWeek] === undefined) {
    state[currentWeek] = [formattedDate];
  } else if (state[currentWeek].indexOf(formattedDate) === -1) {
    state[currentWeek].push(formattedDate);
  }

  return state;
}


export function updateMonthlyRetention(state = {}, formattedDate) {
  const date = moment(formattedDate, DATE_FORMAT);
  const currentWeek = date.format(WEEK_FORMAT);
  const currentMonth = date.format(MONTH_FORMAT);
  logger.debug('Update retention monthly for:', currentMonth);

  if (state[currentMonth] === undefined) {
    state[currentMonth] = [currentWeek];
  } else if (state[currentMonth].indexOf(currentWeek) === -1) {
    state[currentMonth].push(currentWeek);
  }

  return state;
}


export default function updateRetentionState(retentionState) {
  const date = getSynchronizedDate();
  const formattedDate = date.format(DATE_FORMAT);
  logger.debug('Update retention for:', formattedDate);

  // Generate all kinds of retentions.
  retentionState.daily = updateDailyRetention(retentionState.daily, formattedDate);
  retentionState.weekly = updateWeeklyRetention(retentionState.weekly, formattedDate);
  retentionState.monthly = updateMonthlyRetention(retentionState.monthly, formattedDate);

  return retentionState;
}
