/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { waitFor } from '../helpers/wait';
import runtime from '../../platform/runtime';

const isChromeReady = async () => {
  const isWebextension = chrome.extension;

  // on firefox platform, we wait for chrome object as cliqz is ready at that time
  if (!isWebextension) {
    if (typeof chrome !== 'object') {
      throw new Error('chrome object not there yet');
    }

    // if non extension chrome is there, we are most likely in content tests
    return true;
  }

  return new Promise((resolve, reject) => {
    runtime.sendMessage({ name: 'appReady' }).then(({ ready }) => {
      if (ready) {
        resolve(true);
      } else {
        reject();
      }
    }).catch(reject);
    setTimeout(reject, 300);
  });
};

export default function checkIfChromeReady() {
  return waitFor(isChromeReady).catch((e) => {
    window.console.error('failed to access Cliqz background page', e);
    throw e;
  });
}
