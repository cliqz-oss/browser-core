/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from './globals';

export function checkIsWindowActive(tabId) {
  const id = Number(tabId);
  if (isNaN(id) || id < 0) return Promise.resolve(false);

  return new Promise((resolve) => {
    chrome.tabs.get(id, () => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}


export default (chrome && chrome.windows) || undefined;
