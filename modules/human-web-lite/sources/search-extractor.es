/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import parseHtml from './html-parser';
import logger from './logger';
import random from '../core/crypto/random';
import { anonymousHttpGet } from './http';
import { getTimeAsYYYYMMDD } from './timestamps';

export default class SearchExtractor {
  constructor(sanitizer, config) {
    this.sanitizer = sanitizer;
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

    const html = await anonymousHttpGet(doublefetchUrl);
    const doc = await parseHtml(html);
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
    [].forEach.call(rso.querySelectorAll('div.srg'), (x) => {
      const url = (x.querySelector('a.C8nzq') || {}).href;
      const title = (x.querySelector('a > div[role="heading"]') || { textContent: '' }).textContent;
      const age = (x.querySelector('div[jsname="ao5mud"] div.pAkzie div.LZ8hH div.MUxGbd.yDYNvb span.MUxGbd.wuQ4Ob.WZ8Tjf') || { textContent: '' }).textContent;
      if (url && title) {
        results.push({ t: title, u: url, age: age || null });
      }
    });
    if (results.length === 0) {
      return [];
    }

    // TODO: things like ctry=de should not be hard-coded
    // TODO: to simplify delayed sending (and resending after errors),
    // we should not immediately fill in the ts, but only before sending
    const msg = {
      type: 'humanweb',
      action: 'query',
      payload: {
        r: results.map((x, i) => ({ [i]: x })),
        q: query,
        qurl: doublefetchUrl,
        ctry: this.sanitizer.getSafeCountryCode(),
      },
      ver: '2.7',
      channel: this.channel,
      ts: getTimeAsYYYYMMDD(),
      'anti-duplicates': Math.floor(random() * 10000000),
    };
    return [msg];
  }
}
