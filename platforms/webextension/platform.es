/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome, window } from './globals';

function checkUserAgent(pattern) {
  try {
    return navigator.userAgent.indexOf(pattern) !== -1;
  } catch (e) {
    return false;
  }
}

const def = {
  isMobile: checkUserAgent('Mobile'),
  isFirefox: checkUserAgent('Firefox'),
  isChromium: checkUserAgent('Chrome'),
  isEdge: checkUserAgent('Edge'),
  platformName: 'webextension',
};

export default def;

// this should differentiate between cliqz and ghostery apps for mobile
export const appName = (chrome && chrome.cliqzAppConstants)
  ? chrome.cliqzAppConstants.get('MOZ_APP_NAME') : undefined;

export const OS = (
  (chrome && chrome.cliqzAppConstants && chrome.cliqzAppConstants.get('platform'))
  || (window && window.navigator && window.navigator.platform)
  || undefined
);

export function getResourceUrl(path) {
  return chrome.runtime.getURL(`modules/${path}`.replace(/\/+/g, '/'));
}

export function isBetaVersion() {
  const manifest = (chrome
    && chrome.runtime
    && chrome.runtime.getManifest
    && chrome.runtime.getManifest())
    || false;

  return (manifest
    && manifest.applications
    && manifest.applications.gecko
    && typeof manifest.applications.gecko.update_url === 'string'
    && manifest.applications.gecko.update_url.indexOf('/browser_beta/') !== -1)
    || false;
}
