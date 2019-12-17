/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import prefs from '../core/prefs';

// STUB: To have something to start with. Note that these rules
// are not a full port of original rules in human-web.es.
//
// I copied the subset of the rules that we extracted for the
// server (where it is used a last defence against old clients).
//
/* eslint-disable */
function isSuspiciousQueryStub(query) {
  logger.info('[STUB] isSuspiciousQuery is not fully ported.');

  // copied from the navigation extension client code (human-web.es):
  function checkForLongNumber(str, max_number_length) {
    const cstr = str.replace(/[^A-Za-z0-9]/g, '');

    let lcn = 0;
    let maxlcn = 0;
    let maxlcnpos = null;

    for (let i=0;i<cstr.length;i++) {
      if (cstr[i] >= '0' && cstr[i] <= '9') {
        lcn+=1;
      } else {
        if (lcn > maxlcn) {
          maxlcn = lcn;
          maxlcnpos = i;
          lcn = 0;
        } else {
          lcn = 0;
        }
      }
    }

    if (lcn > maxlcn) {
      maxlcn = lcn;
      maxlcnpos = cstr.length;
      lcn = 0;
    } else {
      lcn = 0;
    }

    if (maxlcnpos!=null && maxlcn > max_number_length) {
      return cstr.slice(maxlcnpos-maxlcn, maxlcnpos);
    }

    return null;
  }

  // copied from the navigation extension client code (human-web.es):
  function checkForEmail(str) {
    return /[a-z0-9\-_@]+(@|%40|%(25)+40)[a-z0-9\-_]+\.[a-z0-9\-_]/i.test(str);
  }

  // Remove the msg if the query is too long,
  if (query.length > 50) {
    return true;
  }

  if (query.split(' ').length > 7) {
    return true;
  }

  // Remove the msg if the query contains a number longer than 7 digits
  // can be 666666 but also things like (090)90-2, 5555 3235
  // note that full dates will be removed 2014/12/12
  const haslongnumber = checkForLongNumber(query, 7) !== null;
  if (haslongnumber) {
    return true;
  }

  //Remove if email (exact), even if not totally well formed
  if (checkForEmail(query)) {
    return true;
  }

  //Remove if query looks like an http password
  if (/[^:]+:[^@]+@/.test(query)) {
    return true;
  }

  const v = query.split(' ');
  for (let i=0; i<v.length; i++) {
    if (v[i].length > 20) {
      return true;
    }
    if (/[^:]+:[^@]+@/.test(v[i])) {
      return true;
    }
  }

  return false;
}
/* eslint-enable */

/**
 * Set of heuristics to prevent accidentally leaking sensitive data.
 *
 * It is a hard problem to classify sensititive from non-sensitive data.
 * If you look at the risk of false positives (non-sensitive data being dropped)
 * versus fast negatives (sensitive data being sent out), the risks are very clear.
 *
 * Leaking sensitive data is far more dangerous then dropping harmless messages
 * for multiple reasons. Because of that, we should always thrive for being
 * rather too conservative than being to open when it comes to the heuristics.
 *
 * In other words, because of the non-symmetric risks, it is unavoidable that
 * you will find many harmless examples that will be rejected by the rules.
 */
export default class Sanitizer {
  constructor(config) {
    this.allowedCountryCodes = config.ALLOWED_COUNTRY_CODES;
    if (!this.allowedCountryCodes) {
      throw new Error('config.ALLOWED_COUNTRY_CODES not set');
    }
  }

  isSuspiciousQuery(query) {
    function accept() {
      return {
        accept: true,
      };
    }

    function discard(reason) {
      logger.debug('isSuspiciousQuery rejected query:', query, ', reason:', reason);
      return {
        accept: false,
        reason,
      };
    }

    // TODO: port full Human Web rules
    if (isSuspiciousQueryStub(query)) {
      return discard('failed one of the heuristics in isSuspiciousQueryStub');
    }

    return accept();
  }

  maskURL(url) {
    logger.info('[STUB] maskURL does nothing');
    return url;
  }

  /**
   * Knowing the country of the sender is useful in Human Web data.
   * For example, is allows to build separate search indexes for
   * US, French, or German users.
   *
   * As long as there are enough other users, revealing the country
   * will not compromise anonymity. If the user base is too low
   * (e.g., Liechtenstein), we have to be careful. In that case,
   * do not reveal the country to mitigate fingerprinting attacks.
   *
   * As the number of users varies between products, we get the
   * information from the config.
   */
  getSafeCountryCode() {
    const ctry = prefs.get('config_location', null);
    return this.allowedCountryCodes.includes(ctry) ? ctry : '--';
  }
}
