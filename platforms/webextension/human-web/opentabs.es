/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function getAllOpenPages() {
  return new Promise((resolve, reject) => {
    try {
      const res = [];
      chrome.windows.getAll({ populate: true }, (windows) => {
        windows.forEach((window) => {
          window.tabs.forEach((tab) => {
            res.push(tab.url);
          });
        });
        resolve(res);
      });
    } catch (ee) {
      reject(ee);
    }
  });
}

export default getAllOpenPages;
