import moment from '../platform/lib/moment';

export function parseMoment(str) {
  return moment(str, 'YYYY-MM-DD');
}

export function formatMoment(m) {
  return m.format('YYYY-MM-DD');
}

export function getFormattedDate(ts) {
  return formatMoment(moment(ts));
}

export function getDayRange(ts) {
  const m = moment(ts);
  return {
    start: m.startOf('day').valueOf(),
    end: m.endOf('day').valueOf(),
  };
}
