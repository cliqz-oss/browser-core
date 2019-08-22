/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * As WebExtensions do not provide an API to do DNS resolution,
 * we can only resolve domains that we have recently seen
 * in requests.
 */
export default class {
  constructor() {
    this._domain2IP = new Map();

    // By default, cached entries will expire after 5 minutes.
    // Note: Expired entries will not immediately be purged,
    // but only when "flushExpiredCacheEntries" is called.
    this.ttlInMs = 5 * 60 * 1000;
  }

  resolveHost(hostname) {
    const entry = this._domain2IP.get(hostname);
    if (entry) {
      return Promise.resolve(entry.ip);
    }
    return Promise.reject();
  }

  cacheDnsResolution(hostname, ip) {
    const now = new Date();
    const ttl = new Date(+now + this.ttlInMs);
    this._domain2IP.set(hostname, { ip, ttl });
  }

  flushExpiredCacheEntries() {
    const now = new Date();

    for (const [k, v] of this._domain2IP) {
      if (v.ttl <= now) {
        this._domain2IP.delete(k);
      }
    }
  }
}
