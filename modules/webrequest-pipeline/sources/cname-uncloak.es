/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { isFirefox } from '../core/platform';
import { withTimeout } from '../core/decorators';
import pacemaker from '../core/services/pacemaker';

import logger from './logger';

/**
 * CNAME un-cloaking only works in Firefox and if `dns` API is available.
 */
export function isCnameUncloakSupported(browser) {
  return (
    // Async webRequest only available in Firefox
    isFirefox
    // Feature discovery of `browser.dns.resolve(...)`
    && browser
    && browser.dns
    && browser.dns.resolve
  );
}

export default class {
  /**
   * @param {function} dnsResolve dns.resolve WebExtension API (Firefox)
   */
  constructor(dnsResolve, dnsTTL = 10 * 60 * 1000 /* 10 minutes */) {
    this.dnsResolve = dnsResolve;
    this.dnsCache = new Map();
    this.dnsPending = new Map();
    this.dnsTTL = dnsTTL;

    // Check every few minutes (~10 minutes) that old cache entries are deleted.
    this.cleanInterval = pacemaker.everyFewMinutes(() => {
      logger.debug('[cname] clean cache');
      const now = Date.now();
      for (const [hostname, { ts }] of this.dnsCache) {
        if ((now - ts) > this.dnsTTL) {
          logger.debug('[cname] remove cache entry', hostname);
          this.dnsCache.delete(hostname);
        }
      }
    });
  }

  unload() {
    if (this.cleanInterval !== null) {
      pacemaker.clearTimeout(this.cleanInterval);
      this.cleanInterval = null;
    }
  }

  /**
   * Resolve CNAME for `hostname`.
   */
  resolveCNAME(hostname) {
    // This means we already have a cached CNAME for this hostname.
    const cached = this.dnsCache.get(hostname);
    if (cached !== undefined && (Date.now() - cached.ts) <= this.dnsTTL) {
      logger.debug('[cname] cached', { hostname, cname: cached.cname });
      return cached.cname;
    }

    // This means we already have a request on-going for this hostname.
    const pending = this.dnsPending.get(hostname);
    if (pending !== undefined) {
      logger.debug('[cname] pending', hostname);
      return pending;
    }

    // Request CNAME from DNS for `hostname` with timeout of 2 seconds. We
    // assume that 2 seconds should be enough to get an answer in all cases but
    // we do not want to risk blocking the webRequest callback for too long.
    const dnsRequest = withTimeout(
      this.dnsResolve(hostname, ['canonical_name']),
      2000,
    ).catch((ex) => {
      logger.error('[cname] error while resolving', hostname, ex);
      return { canonicalName: '' };
    }).then(({ canonicalName = '' } = {}) => {
      const cname = canonicalName === hostname ? '' : canonicalName;
      logger.debug('[cname] got record', cname);
      this.dnsCache.set(hostname, {
        cname,
        ts: Date.now()
      });
      this.dnsPending.delete(hostname);
      return cname;
    });

    this.dnsPending.set(hostname, dnsRequest);
    return dnsRequest;
  }
}
