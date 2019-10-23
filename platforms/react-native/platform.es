/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import userAgent from './user-agent';

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
};

export const appName = userAgent.appName;

export const OS = userAgent.OS;

export function isBetaVersion() {
  return false;
}

export function getResourceUrl(path) {
  return path;
}
