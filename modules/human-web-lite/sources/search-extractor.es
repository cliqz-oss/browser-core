/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import parseHtml from './html-parser';
import logger from './logger';
import { truncatedHash } from '../core/helpers/md5';
import random from '../core/crypto/random';
import { anonymousHttpGet } from './http';
import { getTimeAsYYYYMMDD } from '../hpn-lite/timestamps';

function doublefetchQueryHash(query, type) {
  // defines a cooldown to avoid performing unnecessary
  // doublefetch requests in short order
  return truncatedHash(`dfq:${type}:${query.trim()}`);
}

const HOUR = 60 * 60 * 1000;

/**
 * Minimum delay before repeating doublefetch attempts
 * for queries (only counting successful attempts).
 * Waiting for next start of day (in UTC time) is recommended,
 * as trying to send messages earlier is a waste of resources.
 *
 * In addition, enforce a minimum cooldown, intended for people
 * living in timezones like US west coast where UTC midnight
 * happens during the day. Without a minimum cooldown, there is
 * the risk of introducing bias in the collected data, as we
 * would include researches with higher likelihood than in
 * other parts of the world (e.g. Europe).
 */
function chooseExpiration() {
  const minCooldown = 8 * HOUR;
  const tillNextUtcDay = new Date().setUTCHours(23, 59, 59, 999) + 1;
  const tillCooldown = Date.now() + minCooldown;
  const randomNoise = Math.ceil(random() * 2 * HOUR);

  return Math.max(tillCooldown, tillNextUtcDay) + randomNoise;
}

export default class SearchExtractor {
  constructor({ config, sanitizer, persistedHashes }) {
    this.sanitizer = sanitizer;
    this.persistedHashes = persistedHashes;
    this.channel = config.HW_CHANNEL;
    if (!this.channel) {
      throw new Error('config.HW_CHANNEL not configured');
    }
  }

  async runJob({ type, query, doublefetchUrl }) {
    function discard(reason = '') {
      logger.debug('No messages found for query:', query, 'Reason:', reason);
      return {
        messages: [],
        reason,
      };
    }

    const queryCheck = this.sanitizer.isSuspiciousQuery(query);
    if (!queryCheck.accept) {
      return discard(`Dropping suspicious query before double-fetch (${queryCheck.reason})`);
    }

    const queryHash = doublefetchQueryHash(query, type);
    const expireAt = chooseExpiration();
    const wasAdded = await this.persistedHashes.add(queryHash, expireAt);
    if (!wasAdded) {
      return discard('Query has been recently seen.');
    }

    let doc;
    try {
      const html = await anonymousHttpGet(doublefetchUrl);
      doc = await parseHtml(html);
    } catch (e) {
      // unblock the hash to allow retries later
      // (at this point, the error could be caused by a network error,
      // so it is still possible that a retry later could work.)
      logger.info('Failed to fetch query:', doublefetchUrl, e);
      await this.persistedHashes.delete(queryHash).catch(() => {});
      throw e;
    }
    const messages = this.extractMessages({ doc, type, query, doublefetchUrl });
    if (messages.length === 0) {
      return discard('No content found.');
    }

    logger.info(messages.length, 'messages found for query:', query);
    return { messages };
  }

  extractMessages({ doc, type, query, doublefetchUrl }) {
    // TODO: it should be possible to update patterns without new releases
    // (e.g., by porting content-extractor functionality is not option)

    // STUB: hard-coded rules for queries to have something to test with.
    if (type !== 'search-go') {
      return [];
    }
    const rso = doc.getElementById('rso');
    if (!rso) {
      return [];
    }

    const results = [];
    [].forEach.call(rso.querySelectorAll('div.mnr-c.xpd.O9g5cc.uUPGi'), (x) => {
      const url = (x.querySelector('a.C8nzq') || {}).href;
      const title = (x.querySelector('a > div > div') || { textContent: '' }).textContent;
      const age = (x.querySelector('div[id^=tsuid] span.MUxGbd.wuQ4Ob.WZ8Tjf') || { textContent: '' }).textContent;
      if (url && title) {
        results.push({ t: title, u: url, age: age || null });
      }
    });
    if (results.length === 0) {
      return [];
    }

    // TODO: to simplify delayed sending (and resending after errors),
    // we should not immediately fill in the ts, but only before sending
    const msg = {
      type: 'humanweb',
      action: 'hwlite.query',
      payload: {
        r: { ...results },
        q: query,
        qurl: doublefetchUrl,
        ctry: this.sanitizer.getSafeCountryCode(),
      },
      ver: '2.8',
      channel: this.channel,
      ts: getTimeAsYYYYMMDD(),
      'anti-duplicates': Math.floor(random() * 10000000),
    };
    return [msg];
  }
}
