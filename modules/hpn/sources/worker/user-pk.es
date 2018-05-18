import {
  privateKeytoKeypair,
  exportPrivateKey,
  exportPublicKey
} from '../../core/crypto/pkcs-conversion';

import {
  toUTF8,
  toHex,
  fromHex,
  fromBase64
} from '../../core/encoding';

import _http from './http-worker';

import crypto from '../../platform/crypto';

export default class UserPk {
  constructor(CliqzSecureMessage, logger = { log: () => {}, error: () => {} }) {
    this.privateKey = '';
    this.publicKey = '';
    this.logger = logger;
    this.csm = CliqzSecureMessage;
  }

  log(...args) {
    this.logger.log(...args);
  }

  /**
   * Method to sign the str using userSK.
   * @returns signature in hex format.
   */
  sign(msg) {
    const promise = new Promise((resolve, reject) => {
      const ppk = privateKeytoKeypair(this.csm.uPK.privateKey);
      crypto.subtle.importKey(
        'pkcs8',
        fromBase64(ppk[1]),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      )
        .then((privateKey) => {
          const documentBytes = toUTF8(msg);
          crypto.subtle.sign(
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            privateKey,
            documentBytes
          )
            .then((signatureBuffer) => {
              const signatureBytes = new Uint8Array(signatureBuffer);
              const signatureHex = toHex(signatureBytes);
              resolve(signatureHex);
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
    return promise;
  }

  verify(sig, msg) {
    const promise = new Promise((resolve /* , reject */) => {
      const ppk = privateKeytoKeypair(this.csm.uPK.privateKey);
      crypto.subtle.importKey(
        'spki',
        fromBase64(ppk[0]),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      )
        .then((publicKey) => {
          const signatureBytes = fromHex(sig);
          const documentBytes = toUTF8(msg);
          crypto.subtle.verify(
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            publicKey,
            signatureBytes,
            documentBytes
          )
            .then((validSignature) => {
              resolve(validSignature);
            })
            .catch(err => this.log(err));
        });
    });
    return promise;
  }

  generateKey() {
    const promise = new Promise((resolve, reject) => {
      crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: { name: 'SHA-256' },
        },
        true,
        ['sign', 'verify']
      )
        .then(key => crypto.subtle.exportKey('jwk', key.privateKey))
        .then((key) => {
          const returnData = {};
          returnData.privKeyB64 = exportPrivateKey(key);
          returnData.publicKeyB64 = exportPublicKey(key);
          this.privateKey = returnData.privKeyB64;
          this.publicKey = returnData.publicKeyB64;
          return returnData;
        })
        .then(keys =>
          _http(this.csm.USER_REG).post(JSON.stringify({ pk: keys.publicKeyB64 }))
        )
        .then(() =>
          resolve({ status: true, privateKey: this.privateKey, publicKey: this.publicKey })
        )
        .catch(e => reject({ status: e.message }));
    });
    return promise;
  }
}
