/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import window from './window';

function checkUserAgent(pattern = '') {
  return window.navigator.userAgent.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
}

export default {
  isMobile: checkUserAgent('Mobile'),
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
};

export function isOnionModeFactory() {
  return () => false;
}

const userAgent = window.navigator.userAgent.toLowerCase();
export const mobilePlatformName = /iphone|ipod|ipad/.test(userAgent) ? 'ios' : 'android';

export const OS = {
  // TODO
};

export function getResourceUrl() {}

export function isBetaVersion() {
  return false;
}
