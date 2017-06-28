/* eslint-disable camelcase */

import crypto from '../../platform/crypto';
import { toBase64, fromBase64, toHex, fromHex, toUTF8, fromUTF8 } from '../encoding';

import { exportPrivateKey, exportPublicKey } from './pkcs-conversion';

function fromByteArray(data, format) {
  if (format === 'hex') {
    return toHex(data);
  } else if (format === 'b64') {
    return toBase64(data);
  }
  return data;
}
function toByteArray(data, format) {
  if (format === 'hex') {
    return fromHex(data);
  } else if (format === 'b64') {
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
function hash(algo, str, format = 'hex') {
  return crypto.subtle.digest(algo, typeof str === 'string' ? toUTF8(str) : str)
  .then(h => fromArrayBuffer(h, format));
}
function sha256(str, format = 'hex') {
  return hash('SHA-256', str, format);
}
function importAESKey(key) {
  return crypto.subtle.importKey('raw', toArrayBuffer(key, 'hex'),
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
function encryptAES(data, key, iv) {
  return Promise.all([
    iv || crypto.getRandomValues(new Uint8Array(12)),
    typeof key === 'string' ? importAESKey(key) : key,
  ])
  .then(([_iv, _key]) =>
    crypto.subtle.encrypt({ name: 'AES-GCM', iv: _iv }, _key, data)
    .then(encrypted =>
      [fromArrayBuffer(_iv, 'b64'), fromArrayBuffer(encrypted, 'b64')],
    ),
  );
}
// Returns [IV, encryptedData]
function encryptStringAES(txt, key, iv) {
  return encryptAES(toUTF8(txt).buffer, key, iv);
}
function decryptAES(encrypted, key) {
  let iv = encrypted[0];
  let encryptedMsg = encrypted[1];
  iv = new Uint8Array(toArrayBuffer(iv, 'b64'));
  encryptedMsg = toArrayBuffer(encryptedMsg, 'b64');
  return Promise.resolve()
  .then(() => (typeof key === 'string' ? importAESKey(key) : key))
  .then(importedKey => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encryptedMsg));
}
function decryptStringAES(encrypted, key) {
  return decryptAES(encrypted, key)
  .then(decrypted => fromUTF8(new Uint8Array(decrypted)));
}
function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
  );
}
function exportAESKey(key) {
  return crypto.subtle.exportKey('raw', key)
  .then(_key => fromArrayBuffer(_key, 'hex'));
}
function importRSAKey(pk, pub = true, h = 'SHA-256') {
  return crypto.subtle.importKey(
    pub ? 'spki' : 'pkcs8',
    fromBase64(pk),
    {
      name: 'RSA-OAEP',
      hash: { name: h },
    },
    false,
    pub ? ['wrapKey', 'encrypt'] : ['unwrapKey', 'decrypt'],
  );
}
function wrapAESKey(aesKey, publicKey) {
  return Promise.resolve(
    typeof publicKey === 'string' ? importRSAKey(publicKey, true) : publicKey,
  )
  .then(pk =>
    crypto.subtle.wrapKey('raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } }),
  )
  .then(wrapped => toBase64(wrapped));
}
function unwrapAESKey(aesKey, privateKey) {
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
    ),
  );
}
function encryptStringRSA(txt, publicKey) {
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
function rawEncryptRSA(data, publicKey) {
  return importRSAKey(publicKey, true, 'SHA-1')
  .then(key => crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data))
  .then(d => new Uint8Array(d));
}
function _encryptRSA(data, pubKey, aesKey) {
  const wrapPromise = Array.isArray(pubKey) ?
    Promise.all(pubKey.map(x => wrapAESKey(aesKey, x))) :
    wrapAESKey(aesKey, pubKey);
  return Promise.all([
    encryptAES(data, aesKey),
    wrapPromise
  ]);
}
function encryptRSA(data, publicKey, aesKey) {
  if (aesKey) {
    return _encryptRSA(data, publicKey, aesKey);
  }
  return generateAESKey()
  .then(k => _encryptRSA(data, publicKey, k));
}
function decryptRSA(data, privateKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privateKey)
    .then(aesKey => decryptAES(encrypted, aesKey));
}
function decryptStringRSA(data, privateKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privateKey)
    .then(aesKey => decryptStringAES(encrypted, aesKey));
}

function randomBytes(numBytes) {
  return crypto.getRandomValues(new Uint8Array(numBytes));
}

function deriveAESKey(bytes) {
  return sha256(bytes, 'raw')
  .then(h =>
    crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']),
  );
}

function sha1(s) {
  return hash('SHA-1', s);
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
  exportPublicKey
};
