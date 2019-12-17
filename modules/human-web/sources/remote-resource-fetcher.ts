/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fetch, AbortController } from '../core/http';
import pacemaker from '../core/services/pacemaker';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Enforce explicit cooldowns between requests.
 *
 * Note: In the context of the RemoteResourceWatcher this to some degree redundant.
 * For example, once a resource has been fetched, it is cached and will not be refetched
 * again. Also the update function only gets triggered by "pacemaker.everyFewMinutes",
 * so retries should not happen more often than that.
 *
 * What it adds is that it gives more control, especially in the retry scenario,
 * where it can start retrying more aggressively but eventually slowing down when
 * it fails to make process.
 */
class RequestThrottler {
  lastSuccessAt!: number;
  lastAttemptAt!: number;
  attemptsInARow!: number;
  nextTryAfterSuccessAt!: number;
  nextTryAfterAttemptAt!: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.lastSuccessAt = 0;
    this.lastAttemptAt = 0;
    this.attemptsInARow = 0;

    this.nextTryAfterSuccessAt = 0;
    this.nextTryAfterAttemptAt = 0;
  }

  tooManyRequests() {
    const now = Date.now();
    return now <= this.nextTryAfterSuccessAt || now <= this.nextTryAfterAttemptAt;
  }

  getCooldownDuration() {
    const now = Date.now();
    let duration = 0;

    if (this.nextTryAfterSuccessAt > 0) {
      duration = Math.max(duration, this.nextTryAfterSuccessAt - now);
    }
    if (this.nextTryAfterAttemptAt > 0) {
      duration = Math.max(duration, this.nextTryAfterAttemptAt - now);
    }

    // some buffer to avoid waking up too early
    return duration + 1 * SECOND;
  }

  attempt() {
    const now = Date.now();
    this.lastAttemptAt = now;
    this.attemptsInARow += 1;

    const cooldown = 5 * SECOND * Math.pow(2, this.attemptsInARow);
    this.nextTryAfterAttemptAt = now + this._adjustCooldown(cooldown);
  }

  success() {
    const now = Date.now();
    this.lastSuccessAt = now;
    this.attemptsInARow = 0;

    // Cooldowns after a successful fetch are somewhat redundant,
    // as the cache should take care of it already.
    const cooldown = 3 * MINUTE;
    this.nextTryAfterSuccessAt = now + this._adjustCooldown(cooldown);
    this.nextTryAfterAttemptAt = 0;
  }

  // Introduce a bit of noise to rule out that once a resource changes,
  // clients coordinate on the fetch strategy from that time onward.
  //
  // Also ensure that we can guarantee at least one or two attempts per day.
  // Note that once the extension restarts, everything is reset. That
  // means such high cooldowns are only possible if you never restart
  // the browser.
  _adjustCooldown(cooldown: number) {
    return Math.min(cooldown, 12 * HOUR) * (Math.random() + 1.5) / 2.0;
  }
}

export default class RemoteResourceFetcher {
  url: string;
  binary: boolean;
  throttler: RequestThrottler;

  constructor({ url, binary }) {
    this.url = url;
    this.binary = binary;
    this.throttler = new RequestThrottler();
  }

  async fetch(timeout = 60 * SECOND) {
    this.throttler.attempt();
    const controller = new AbortController();
    const signal = controller.signal;
    let requestAborted = false;
    const timer = pacemaker.setTimeout(() => {
      requestAborted = true;
      controller.abort();
    }, timeout);
    try {
      const res = await fetch(this.url, {
        credentials: 'omit',
        cache: 'no-cache',
        signal,
      });
      if (!res.ok) {
        throw new Error(res.statusText);
      }

      let content: Uint8Array|string;
      if (this.binary) {
        content = new Uint8Array(await res.arrayBuffer());
      } else {
        content = await res.text();
      }

      this.throttler.success();
      return content;
    } catch (e) {
      if (requestAborted) {
        throw new Error(`Request to ${this.url} timed out`);
      }
      throw e;
    } finally {
      pacemaker.clearTimeout(timer);
    }
  }

  tooManyRequests() {
    return this.throttler.tooManyRequests();
  }

  resetRateLimits() {
    this.throttler.reset();
  }

  getCooldownDuration() {
    return this.throttler.getCooldownDuration();
  }
}
