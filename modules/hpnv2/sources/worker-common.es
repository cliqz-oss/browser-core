/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function makeWorker(_self, getCredentialManager) {
  const self = _self;
  const console = {
    log: (...args) => self.postMessage({ logMessage: { type: 'log', args } }),
    error: (...args) => self.postMessage({ logMessage: { type: 'error', args } })
  };

  function wrapError(e) {
    return `Worker error: '${e && e.message}', stack: <<< ${e && e.stack} >>>`;
  }

  // Assuming there are no two concurrent messages being handled (caller
  // waits for response before sending another message)
  let signer;
  self.onmessage = async ({ data: { id, fn, args } }) => {
    if (!signer) {
      const CredentialManager = await getCredentialManager();
      signer = new CredentialManager();
    }
    const now = performance.now();
    try {
      const data = signer[fn](...args);
      console.log('[hpnv2-worker]', fn, performance.now() - now, 'ms');
      self.postMessage({ id, data });
    } catch (e) {
      const error = wrapError(e);
      console.error('[hpnv2-worker]', error);
      self.postMessage({ id, error });
    }
  };
}
