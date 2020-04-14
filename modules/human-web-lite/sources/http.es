/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/* eslint-disable import/prefer-default-export */

const SECOND = 1000;

// TODO: Can we use the "AbortController" API on Mobile? Otherwise,
// running jobs in background might be difficult because we risk that
// the app will be killed.
export async function anonymousHttpGet(url, { timeout = 15 * SECOND } = {}) {
  const options = {
    credentials: 'omit',
    mode: 'no-cors',
    redirect: 'manual',

    // TODO: Or maybe this does work? It is not part of the fetch standard,
    // but I have seen it in some react-native examples.
    // If it works, it could be used if AbortController is not available.
    timeout,
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch url ${url}: ${response.statusText}`);
  }
  return response.text();
}
