/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getActiveTab } from '../platform/browser';

import { isUrl } from '../core/url';

import AdblockerBackground from './background';
import config from './config';

export default class Win {
  constructor({ window }) {
    this.window = window;
  }

  init() {}

  unload() {}

  status() {
    if (config.abtestEnabled === false) {
      return undefined;
    }

    return getActiveTab().then(({ id, url }) => {
      const isCorrectUrl = isUrl(url);
      let disabledForUrl = false;
      let disabledForDomain = false;
      let disabledEverywhere = false;

      // Check if adblocker is disabled on this page
      if (isCorrectUrl && AdblockerBackground.adblocker !== null) {
        const whitelist = AdblockerBackground.adblocker.whitelist.getState(url);
        disabledForDomain = whitelist.hostname;
        disabledForUrl = whitelist.url;
      }

      const report = AdblockerBackground.adblocker !== null
        ? AdblockerBackground.adblocker.stats.report(id)
        : {
          totalCount: 0,
          advertisersList: {},
          advertisersInfo: {},
        };

      const enabled = AdblockerBackground.adblocker !== null;
      disabledEverywhere = !enabled && !disabledForUrl && !disabledForDomain;

      // Check stat of the adblocker
      let state;
      if (!enabled) {
        state = 'off';
      } else if (disabledForUrl || disabledForDomain) {
        state = 'off';
      } else {
        state = 'active';
      }

      // Check disable state
      let offState;
      if (disabledForUrl) {
        offState = 'off_website';
      } else if (disabledForDomain) {
        offState = 'off_domain';
      } else if (disabledEverywhere) {
        offState = 'off_all';
      } else {
        offState = 'off_website';
      }

      return {
        visible: true,
        enabled: enabled && !disabledForDomain && !disabledForUrl,
        optimized: config.strictMode,
        disabledForUrl,
        disabledForDomain,
        disabledEverywhere,
        totalCount: report.totalCount,
        advertisersList: report.advertisersList,
        advertisersInfo: report.advertisersInfo,
        state,
        off_state: offState,
      };
    });
  }
}
