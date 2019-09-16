/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import crypto from '../../platform/crypto';
import { toBase64, fromBase64, toHex, fromHex, toUTF8, fromUTF8 } from '../encoding';

import { exportPrivateKey, exportPublicKey } from './pkcs-conversion';

function fromByteArray(data, format) {
  if (format === 'hex') {
    return toHex(data);
  }
  if (format === 'b64') {
    return toBase64(data);
  }
  return data;
}
function toByteArray(data, format) {
  if (format === 'hex') {
    return fromHex(data);
  }
  if (format === 'b64') {
    return fromBase64(data);
  }
  return data;
}
function fromArrayBuffer(data, format) {
  return fromByteArray(new Uint8Array(data), format);
}
function toArrayBuffer(data, format) {
  return toByteArray(data, format).buffer;
}
async function hash(algo, str, format = 'hex') {
  return crypto.subtle.digest(algo, typeof str === 'string' ? toUTF8(str) : str)
    .then(h => fromArrayBuffer(h, format));
}
async function sha256(str, format = 'hex') {
  return hash('SHA-256', str, format);
}
async function importAESKey(key) {
  return crypto.subtle.importKey('raw', toArrayBuffer(key, 'hex'),
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
async function encryptAES(data, key, iv) {
  return Promise.all([
    iv || crypto.getRandomValues(new Uint8Array(12)),
    typeof key === 'string' ? importAESKey(key) : key,
  ])
    .then(([_iv, _key]) =>
      crypto.subtle.encrypt({ name: 'AES-GCM', iv: _iv }, _key, data)
        .then(encrypted =>
          [fromArrayBuffer(_iv, 'b64'), fromArrayBuffer(encrypted, 'b64')]));
}
// Returns [IV, encryptedData]
async function encryptStringAES(txt, key, iv) {
  return encryptAES(toUTF8(txt).buffer, key, iv);
}
async function decryptAES(encrypted, key) {
  let iv = encrypted[0];
  let encryptedMsg = encrypted[1];
  iv = new Uint8Array(toArrayBuffer(iv, 'b64'));
  encryptedMsg = toArrayBuffer(encryptedMsg, 'b64');
  return Promise.resolve()
    .then(() => (typeof key === 'string' ? importAESKey(key) : key))
    .then(importedKey => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encryptedMsg));
}
async function decryptStringAES(encrypted, key) {
  return decryptAES(encrypted, key)
    .then(decrypted => fromUTF8(new Uint8Array(decrypted)));
}
async function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
  );
}
async function exportAESKey(key) {
  return crypto.subtle.exportKey('raw', key)
    .then(_key => fromArrayBuffer(_key, 'hex'));
}
async function importRSAKey(pk, pub = true, h = 'SHA-256', algorithm = 'RSA-OAEP') {
  let uses;
  if (pub) {
    if (algorithm === 'RSA-OAEP') {
      uses = ['wrapKey', 'encrypt'];
    } else {
      uses = ['verify'];
    }
  } else if (algorithm === 'RSA-OAEP') {
    uses = ['unwrapKey', 'decrypt'];
  } else {
    uses = ['sign'];
  }
  return crypto.subtle.importKey(
    pub ? 'spki' : 'pkcs8',
    fromBase64(pk),
    {
      name: algorithm,
      hash: { name: h },
    },
    true,
    uses,
  );
}
async function wrapAESKey(aesKey, publicKey) {
  return Promise.resolve(
    typeof publicKey === 'string' ? importRSAKey(publicKey, true) : publicKey,
  )
    .then(pk =>
      crypto.subtle.wrapKey('raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } }))
    .then(wrapped => toBase64(wrapped));
}
async function unwrapAESKey(aesKey, privateKey) {
  return Promise.resolve(
    typeof privateKey === 'string' ? importRSAKey(privateKey, false) : privateKey,
  )
    .then(pk =>
      crypto.subtle.unwrapKey(
        'raw',
        fromBase64(aesKey),
        pk,
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: { name: 'SHA-256' },
        },
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt'],
      ));
}
async function encryptStringRSA(txt, publicKey) {
  return generateAESKey()
    .then((aesKey) => {
      let promise;
      if (Array.isArray(publicKey)) {
        promise = Promise.all(publicKey.map(x => wrapAESKey(aesKey, x)));
      } else {
        promise = wrapAESKey(aesKey, publicKey);
      }
      return Promise.all([
        encryptStringAES(txt, aesKey),
        promise,
      ]);
    });
}
async function rawEncryptRSA(data, publicKey) {
  return importRSAKey(publicKey, true, 'SHA-1')
    .then(key => crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data))
    .then(d => new Uint8Array(d));
}
async function _encryptRSA(data, pubKey, aesKey) {
  const wrapPromise = Array.isArray(pubKey)
    ? Promise.all(pubKey.map(x => wrapAESKey(aesKey, x)))
    : wrapAESKey(aesKey, pubKey);
  return Promise.all([
    encryptAES(data, aesKey),
    wrapPromise
  ]);
}
async function encryptRSA(data, publicKey, aesKey) {
  if (aesKey) {
    return _encryptRSA(data, publicKey, aesKey);
  }
  return generateAESKey()
    .then(k => _encryptRSA(data, publicKey, k));
}
async function decryptRSA(data, privateKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privateKey)
    .then(aesKey => decryptAES(encrypted, aesKey));
}
async function decryptStringRSA(data, privateKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privateKey)
    .then(aesKey => decryptStringAES(encrypted, aesKey));
}

function randomBytes(numBytes) {
  return crypto.getRandomValues(new Uint8Array(numBytes));
}

async function deriveAESKey(bytes) {
  return sha256(bytes, 'raw')
    .then(h =>
      crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']));
}

// TODO: polyfill for Edge!
async function sha1(s) {
  return hash('SHA-1', s);
}

async function generateRSAKeypair(bits = 2048, hashName = 'SHA-256') {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: hashName },
    },
    true,
    ['sign', 'verify'],
  )
    .then(key => Promise.all([
      crypto.subtle.exportKey(
        'spki',
        key.publicKey,
      )
        .then(toBase64),
      crypto.subtle.exportKey(
        'pkcs8',
        key.privateKey,
      )
        .then(toBase64),
    ]));
}

async function signRSA(privateKey, data) {
  const _data = typeof data === 'string' ? toUTF8(data) : data;
  return toHex(await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    privateKey,
    _data
  ));
}

export {
  hash,
  sha256,
  fromByteArray,
  toByteArray,
  fromArrayBuffer,
  toArrayBuffer,
  encryptAES,
  encryptStringAES,
  decryptAES,
  decryptStringAES,
  generateAESKey,
  exportAESKey,
  importAESKey,
  importRSAKey,
  wrapAESKey,
  unwrapAESKey,
  encryptStringRSA,
  rawEncryptRSA,
  encryptRSA,
  decryptRSA,
  decryptStringRSA,
  randomBytes,
  deriveAESKey,
  sha1,
  exportPrivateKey,
  exportPublicKey,
  generateRSAKeypair,
  signRSA
};
