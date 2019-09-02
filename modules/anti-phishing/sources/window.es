/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../core/prefs';
import CliqzAntiPhishing from './anti-phishing';
import { getActiveTab } from '../platform/browser';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  }

  unload() {
  }

  async status() {
    const { url } = await getActiveTab();
    const isWhitelisted = CliqzAntiPhishing.isInWhitelist(url);
    const whitelistStatus = CliqzAntiPhishing.getUrlWhitelistStatus(url);
    const active = prefs.get('cliqz-anti-phishing-enabled', true);
    let state = 'active';
    if (isWhitelisted && whitelistStatus !== CliqzAntiPhishing.WHITELISTED_TEMPORARY) {
      state = 'inactive';
    }
    if (!active) {
      state = 'critical';
    }
    return {
      visible: true,
      active,
      isWhitelisted,
      state
    };
  }
}
