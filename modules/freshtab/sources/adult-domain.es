/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BloomFilterUtils } from '../platform/bloom-filter-utils';
import console from '../core/console';

const ADULT_DOMAINS_BF_FILE_URI = 'chrome://cliqz/content/freshtab/adult-domains.bin';

export default class AdultDomain {
  constructor() {
    try {
      this.filter = BloomFilterUtils.loadFromInput(ADULT_DOMAINS_BF_FILE_URI, 'uri')[0];
    } catch (e) {
      console.log('Adult Domain List failed loading');
    }
  }

  isAdult(domain) {
    if (!this.filter) return false;
    return this.filter.test(domain);
  }
}
