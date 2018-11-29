import moment from '../../platform/lib/moment';

export const CONFIG_TS_FORMAT = 'YYYYMMDD';

/**
 * This returns a new `moment` object everytime we need one because most
 * operations like `add` or `subtract` are mutating the object in-place in
 * momentjs. This way we are sure we do not have such changes between function
 * invokations.
 */
function getEpoch() {
  return moment('19700101', 'YYYYMMDD');
}

export function daysSinceEpochToDate(days) {
  return getEpoch().add(days, 'days');
}

export function dateToDaysSinceEpoch(date) {
  return date.diff(getEpoch(), 'days');
}

export function formattedToDate(date, format) {
  return moment(date, format);
}

export function isConfigTsDate(date) {
  return (
    typeof date === 'string'
    && date.length === CONFIG_TS_FORMAT.length
    && moment(date, CONFIG_TS_FORMAT).isValid()
  );
}
