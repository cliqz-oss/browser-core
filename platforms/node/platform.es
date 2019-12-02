/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  isMobile: false,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'node',
};

export function isWindows() {
  return false;
}

export function isLinux() {
  return false;
}

export function isMac() {
  return false;
}

export function isMobile() {
  return false;
}

export function isBetaVersion() {
  return false;
}
