/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { registerContentScript } from '../core/content/register';
import createModuleWrapper from '../core/helpers/action-module-wrapper';
import createChartWidget from './widget';

async function checkUrls(whotracksme) {
  const nodes = document.querySelectorAll('#search .r > a');
  if (nodes === null) {
    return;
  }

  const urls = [...nodes].map((node) => {
    const href = node.getAttribute('href') || '';
    if (href.startsWith('/url?')) {
      return new URLSearchParams(href).get('url');
    }
    return href;
  });

  const trackingInfo = await whotracksme.getTrackingInfo(urls);

  nodes.forEach((node, i) => {
    const trackerData = trackingInfo[i];
    const div = createChartWidget(trackerData);
    node.after(div);
  });
}

function onLoad(window) {
  const whotracksme = createModuleWrapper('whotracksme');
  window.addEventListener('load', () => checkUrls(whotracksme));
}

registerContentScript({
  module: 'whotracksme',
  matches: ['https://www.google.com/search*'],
  js: [onLoad],
});
