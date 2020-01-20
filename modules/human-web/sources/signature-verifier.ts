/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fromBase64 } from '../core/encoding';
import crypto from '../platform/crypto';
import logger from './logger';

export function parsePublicKeyPem(key_: string): string {
  const START_TAG = '-----BEGIN PUBLIC KEY-----';
  const END_TAG = '-----END PUBLIC KEY-----';

  const key = key_.trim();
  if (!key.startsWith(START_TAG) || !key.endsWith(END_TAG)) {
    throw new Error(`Expected PEM format (${START_TAG} ... ${END_TAG}), but got: ${key_}`);
  }
  return key.slice(START_TAG.length, key.length - END_TAG.length).replace(/\s+/g, '');
}

// like fromBase64, but always throws on parse errors
function safeFromBase64(text: string): string {
  const result = fromBase64(text);
  if (!result) {
    throw new Error('Failed to decode base64 string');
  }
  return result;
}

function loadPublicKey(publicKey: string): string {
  const key = parsePublicKeyPem(publicKey);
  return safeFromBase64(key);
}

export default class SignatureVerifier {
  resourceUrl: string;
  signatureUrl: string;

  algorithm: string;
  insecure: boolean;
  private _pendingInit: Promise<void>|null;
  publicKey?: CryptoKey;

  constructor({
    resourceUrl,
    publicKeyName,
    publicKeyPem,
    algorithm = 'RSA-PSS',
    insecure = false
  }: {
    resourceUrl: string,
    publicKeyName: string,
    publicKeyPem: string,
    algorithm: string,
    insecure: boolean
  }) {
    this.resourceUrl = resourceUrl;
    this.signatureUrl = `${resourceUrl}.signed-with-${publicKeyName}`;
    this.algorithm = algorithm;
    this.insecure = insecure;
    if (this.insecure) {
      logger.warn(`Signature verification will not be enforced for URL ${resourceUrl}. ` +
        `However, this is not recommended, besides for development purposes.`);
    }

    // Note: the crypto API is async, but conceptually we want to
    // ensure that we get errors during initialization. For that
    // the caller has to cooperate and run "ensureKeysAreLoaded"
    // afterwards.
    const publicKeyBuffer = loadPublicKey(publicKeyPem);
    let options;
    if (this.algorithm === 'RSA-PSS') {
      options = {
        name: this.algorithm,
        hash: {
          name: 'SHA-256',
        },
      };
    } else if (this.algorithm === 'RSASSA-PKCS1-v1_5') {
      // Legacy path: can be used as a fallback for Edge
      // (Technically, PKCS1-v1_5 padding is not broken, but its use
      // is no longer recommended.)
      options = {
        name: this.algorithm,
        hash: {
          name: 'SHA-256',
        },
      };
    } else {
      throw new Error(`Unexpected verification algorithm: ${this.algorithm}`);
    }

    this._pendingInit = (async () => {
      try {
        this.publicKey = await crypto.subtle.importKey('spki', publicKeyBuffer, options, false, ['verify']);
        logger.info('Successfully loaded the public key for verifying signatures signed with', publicKeyName);
      } catch (e) {
        // Typically, the error messages of crypto.subtle are useless.
        // Log them anyway, but do expect to get much out of it.
        //
        // Reasons could be browser support, misformed keys, trying to
        // accidentally import a private keys, etc.
        logger.error(`crypto.subtle.importKey failed for key ${publicKeyName} (details: ${e})`);
        if (!insecure) {
          throw new Error(`Failed to import the key ${publicKeyName} (error: ${e}).`);
        }
        logger.info('Failed to load the public key', publicKeyName,
                    'but as signature checking is disabled, ignore the error');
      }
    })();
  }

  // Can be called to ensure fail-fast behavior if keys cannot
  // to loaded. Otherwise, you will get the error when you start
  // verifying signatures.
  //
  // There is no way to recover except by disabling signature
  // checking (by setting the 'insecure' flag), or switching to
  // alternative crypto algorithms.
  //
  // Hint: The following test page will give you an overview
  // of all the crypto.subtle algorithms that your browser implements:
  //
  // https://diafygi.github.io/webcrypto-examples/
  //
  async ensureKeysAreLoaded() {
    if (this._pendingInit) {
      try {
        await this._pendingInit;
      } finally {
        this._pendingInit = null;
      }
    }
  }

  async checkSignature(message: Uint8Array, signature: string) : Promise<boolean> {
    let goodSignature = false;
    try {
      goodSignature = await this._checkSignature(message, signature);
      if (!goodSignature) {
        logger.warn('Signature did not match for url:', this.signatureUrl);
      }
    } catch (e) {
      logger.warn('Fatal error while verifying signature', e);
    }

    if (!goodSignature && this.insecure) {
      logger.info('"insecure" flag is set. Ignore signature verification error for URL:', this.signatureUrl);
      return true;
    }

    return goodSignature;
  }

  async _checkSignature(message: Uint8Array, signature: string) : Promise<boolean> {
    await this.ensureKeysAreLoaded();
    if (!this.publicKey) {
      throw new Error('Keys are not loaded. Signatures cannot be checked.');
    }

    let signature_: Uint8Array;
    try {
      signature_ = fromBase64(signature);
    } catch (e) {
      logger.warn('Signature is not properly encoded. Expected base64 but got:', signature);
      return false;
    }

    try {
      const before = Date.now();
      let options;
      if (this.algorithm === 'RSA-PSS') {
        options = {
          name: 'RSA-PSS',
          saltLength: 32,
        };
      } else if (this.algorithm === 'RSASSA-PKCS1-v1_5') {
        options = {
          name: 'RSASSA-PKCS1-v1_5',
          hash: {
            name: 'SHA-256',
          },
        }
      } else {
        throw new Error(`Unexpected verification algorithm: ${this.algorithm}`);
      }

      const isValid = await crypto.subtle.verify(options, this.publicKey, signature_, message);
      logger.debug('verify took', Date.now() - before, 'ms');

      return isValid;
    } catch (e) {
      // This path should normally not be reachable unless the platform does
      // not support the crypto operation. In that case, it is a fatal error.
      throw new Error(`Unable to verify signature (crypto operations not supported). Error message: ${e}`);
    }
  }
}
