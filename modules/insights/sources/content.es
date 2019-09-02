/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerContentScript } from '../core/content/register';
import { setTimeout } from '../core/timers';

function analyzePageInfo(CLIQZ) {
  const { host, hostname, pathname, protocol } = document.location;
  const pTime = (performance.timing.domContentLoadedEventStart - performance.timing.requestStart);
  const pageLatency = pTime || 0;

  CLIQZ.app.modules.insights.action('recordPageInfo', {
    domain: `${protocol}//${host}${pathname}`,
    host: hostname,
    timestamp: performance.timing.navigationStart,
    latency: pageLatency,
    pageTiming: {
      timing: {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd
      }
    }
  });
}

function contentScript(window, chrome, CLIQZ) {
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        analyzePageInfo(CLIQZ);
      }, 1);
    });
  } else {
    analyzePageInfo(CLIQZ);
  }
}

registerContentScript({
  module: 'insights',
  matches: [
    'http://*/*',
    'https://*/*',
  ],
  js: [contentScript],
});
