import { getMessage } from '../core/i18n';

const parseTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return {
    h: Math.floor(s / 3600),
    m: Math.floor(s / 60) % 60,
    s: s % 60,
  };
};

export default (ms) => {
  if (!ms) { return `0 ${getMessage('time_saved_seconds')}`; }

  const time = parseTime(ms);
  let res = '';

  res = time.h > 0 ? `${time.h} ${getMessage('time_saved_hours')}` : '';
  res += time.m > 0 ? ` ${time.m} ${getMessage('time_saved_minutes')}` : '';
  if (res === '') {
    res = `${time.s} ${getMessage('time_saved_seconds')}`;
  }
  return res.trim();
};
