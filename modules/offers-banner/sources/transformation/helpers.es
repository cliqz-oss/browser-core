const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

/* eslint-disable import/prefer-default-export */
export function calculateValidity(expirationTime, timeFrom = Date.now()) {
  if (!expirationTime) { return {}; }
  const timeDiff = (expirationTime * 1000) - timeFrom;
  if (timeDiff < 0) { return {}; }

  let diff = Math.floor(timeDiff / ONE_DAY);
  if (diff >= 1) {
    const leftSome = diff > 2 && diff < 7;
    return { diff, diffUnit: 'day', expired: { soon: diff <= 2, leftSome } };
  }

  diff = Math.floor(timeDiff / ONE_HOUR);
  if (diff >= 1) { return { diff, diffUnit: 'hour', expired: { soon: true } }; }

  diff = Math.floor(timeDiff / ONE_MINUTE);
  return { diff, diffUnit: 'minute', expired: { soon: true } };
}
/* eslint-enable import/prefer-default-export */
