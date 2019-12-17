/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { equals as urlEquals } from '../../core/url';
import { clearTimeout, setTimeout } from '../../core/timers';
import { fetch, AbortController } from '../fetch';

// There needs to proper implementation, to avoid cases like:
// 1. Downloading streams.
// 2. Origin in web-extension.
export function getRequest(url) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let timeout;
    try {
      const abortController = new AbortController();
      timeout = setTimeout(() => {
        timeout = null;
        reject(new Error('timeout'));
        abortController.abort();
      }, 10000);

      const response = await fetch(url, {
        credentials: 'omit',
        cache: 'no-cache',
        signal: abortController.signal,
      });
      if (response.status !== 200 && response.status !== 0 /* local files */) {
        reject(new Error(`status not valid: ${response.status}`));
        abortController.abort();
        return;
      }
      if (!urlEquals(response.url, url)
        && !urlEquals(decodeURI(decodeURI(response.url)), decodeURI(decodeURI(url)))) {
        // there has been a redirect, we cannot guarantee that cookies were
        // not sent, therefore fail and consider as private
        reject(new Error(`DANGER: ${url} != ${response.url}`));
        abortController.abort();
        return;
      }

      const text = await response.text();
      resolve(text);
    } catch (e) {
      reject(e);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  });
}

export default getRequest;
