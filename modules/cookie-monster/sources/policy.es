
const ONE_HOUR = 1000 * 60 * 60; // one hour
const ONE_WEEK = 1000 * 60 * 60 * 24 * 7; // one week
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30; // 30 days

export class TrackerCookiePolicy {
  appliesTo(cookie, isTracker) {
    return isTracker;
  }

  /**
   * If this domain has been visited as a first party, the cookie expiries in 30 or 7 days,
   * depending on frequency of visits. Otherwise cookie is expired one hour after creation.
   * @param cookie
   * @param visits
   */
  getExpiry(cookie, visits) {
    if (visits > 0) {
      const duration = visits > 6 ? THIRTY_DAYS : ONE_WEEK;
      return Date.now() + duration;
    }
    return cookie.created + ONE_HOUR;
  }
}

export class SessionCookiePolicy {
  appliesTo(cookie) {
    return cookie.session;
  }

  /**
   * Session cookies are expired after one day
   * @param cookie
   * @param visits
   */
  getExpiry(cookie) {
    return cookie.created + (ONE_HOUR * 24);
  }
}

export class NonTrackerCookiePolicy {
  appliesTo(cookie, isTracker) {
    return !isTracker && !cookie.session;
  }

  /**
   * Non-tracker cookies are expired after:
   *  - 30 days from last usage date for httpOnly cookies
   *  - One week after created otherwise
   * @param cookie
   */
  getExpiry(cookie) {
    // Non-httpOnly cookies get expired after a week
    if (!cookie.httpOnly) {
      return Date.now() + ONE_WEEK;
    }
    // Max 30 days cookies
    return Date.now() + THIRTY_DAYS;
  }
}

const cookieSpecialTreatment = {
  _ga: ONE_WEEK,
  _gid: ONE_HOUR,
  _fbp: 1,
};

export class SpecialCookiePolicy {
  appliesTo(cookie) {
    return !!cookieSpecialTreatment[cookie.name];
  }

  /**
   * Special rules for known first-party tracking cookies.
   * @param cookie
   */
  getExpiry(cookie) {
    return cookie.created + cookieSpecialTreatment[cookie.name];
  }
}
