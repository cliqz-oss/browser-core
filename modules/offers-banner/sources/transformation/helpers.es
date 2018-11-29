const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export default function calculateValidity(expirationTime, timeFrom = Date.now()) {
  if (!expirationTime) { return [null, null, null]; }
  const timeDiff = (expirationTime * 1000) - timeFrom;
  if (timeDiff < 0) { return [null, null, null]; }

  let diff = Math.floor(timeDiff / ONE_DAY);
  let diffUnit = diff === 1 ? 'offers_expires_day' : 'offers_expires_days';
  if (diff >= 1) { return [diff, diffUnit, diff === 2]; }

  diff = Math.floor(timeDiff / ONE_HOUR);
  diffUnit = diff === 1 ? 'offers_expires_hour' : 'offers_expires_hours';
  if (diff >= 1) { return [diff, diffUnit, true]; }

  diff = Math.floor(timeDiff / ONE_MINUTE);
  diffUnit = diff === 1 ? 'offers_expires_minute' : 'offers_expires_minutes';
  return [diff, diffUnit, true];
}
