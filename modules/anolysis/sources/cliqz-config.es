/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AsyncStorage from '../platform/async-storage';
import getDexie from '../platform/lib/dexie';
import { getChannel } from '../platform/demographics';
import { isBetaVersion } from '../platform/platform';

import { platformName } from '../core/platform';
import { httpPost } from '../core/http';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';

import AnolysisDexieStorage from './internals/storage/dexie';
import AnolysisAsyncStorage from './internals/storage/async-storage';

async function shouldUseStaging() {
  const channel = await getChannel();
  return (
    prefs.get('developer', false) === true
    || channel === '99' // Jenkins
    || channel === 'MR99' // Jenkins
    || channel === 'MR02' // Debug
    || channel === 'MA99' // Jenkins
    || channel === 'MA02' // Debug
    || channel === 'MI99' // Jenkins
    || channel === 'MI02' // Debug
    || channel === 'MI52' // Debug
    || channel === 'MA52' // Debug
  );
}

async function instantiateStorage() {
  // If platform is 'react-native' (platformName === 'mobile'), this means that
  // IndexedDB is not available and we should use AsyncStorage instead (on other
  // platforms this will be mocked with an in-memory storage). On all other
  // platforms (webextension, bootstrap) we use Dexie on top of IndexedDB.
  if (platformName === 'mobile') {
    return new AnolysisAsyncStorage(AsyncStorage);
  }

  return new AnolysisDexieStorage(await getDexie());
}

const isMobileConnection = async (browser) => {
  if (!browser.networkStatus || !browser.networkStatus.getLinkInfo) {
    return false;
  }
  const connectionInfo = await browser.networkStatus.getLinkInfo();
  return ['wimax', '2g', '3g', '4g'].includes(connectionInfo.type);
};

export default async function (browser, demographics, settings) {
  return {
    // Session ID of the users to generate ephemerid.
    session: (inject.service('session', ['getSession'])).getSession(),

    backend: {
      url: ((await shouldUseStaging())
        ? settings.ANOLYSIS_STAGING_BACKEND_URL
        : settings.ANOLYSIS_BACKEND_URL
      ),
      // Helper function used to send a json `payload` to `url` using a POST
      // request. This returns a promise resolving to the answer if any, or
      // rejecting on any exception or wrong HTTP code.
      post: async (url, payload) => {
        if (await isMobileConnection(browser)) {
          return Promise.reject(new Error('Device is not connected to WiFi'));
        }

        return new Promise((resolve, reject) => {
          httpPost(
            url,
            (req) => {
              try {
                const json = JSON.parse(req.response);
                resolve(json);
              } catch (ex) {
                reject(new Error(`Backend ${url} could not parse JSON: ${req.response}`));
              }
            },
            JSON.stringify(payload),
            reject,
            1000 * 15, // Request timeout = 15 seconds
          );
        });
      },
    },

    queue: {
      batchSize: prefs.get('modules.anolysis.queue.batchSize', 5),
      sendInterval: prefs.get('modules.anolysis.queue.sendInterval', 5 * 1000),
      maxAttempts: prefs.get('modules.anolysis.queue.maxAttempts', 5),
    },

    storage: await instantiateStorage(),

    signals: {
      meta: {
        // This allows us to filter out signals coming from developers in the
        // backend. This is not privacy breaching because all normal users will
        // have `false` as value for this attribute.
        dev: prefs.get('developer', false) === true,

        // If this is a beta version of the extension. Allows us to compare changes
        // on master with the current production version.
        beta: isBetaVersion(),

        // Demographics of the users.
        demographics,
      },
    },
  };
}
