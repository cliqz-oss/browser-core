import { toBase64, fromBase64, toHex, fromHex } from '../core/encoding';

import crypto from '../platform/crypto';


function fromArrayBuffer(data, format) {
  const newdata = new Uint8Array(data);
  if (format === 'hex') {
    return toHex(newdata);
  } else if (format === 'b64') {
    return toBase64(newdata);
  }
  return newdata;
}


function toArrayBuffer(data, format) {
  if (format === 'hex') {
    return fromHex(data).buffer;
  } else if (format === 'b64') {
    return fromBase64(data).buffer;
  }
  return data;
}


function generateAESIv() {
  return crypto.getRandomValues(new Uint8Array(12));
}


export function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}


function importAESKey(key) {
  return crypto.subtle.importKey('raw', toArrayBuffer(key, 'hex'),
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}


export function encryptAES(data, key, iv) {
  return Promise.all([
    iv || generateAESIv(),
    typeof key === 'string' ? importAESKey(key) : key,
  ]).then(([_iv, _key]) =>
       crypto.subtle.encrypt({ name: 'AES-GCM', iv: _iv }, _key, data)
       .then(encrypted =>
          [fromArrayBuffer(_iv, 'b64'), fromArrayBuffer(encrypted, 'b64')]
       )
     );
}


export function decryptAES(encrypted, key) {
  let iv = encrypted[0];
  let encryptedMsg = encrypted[1];
  iv = new Uint8Array(toArrayBuffer(iv, 'b64'));
  encryptedMsg = toArrayBuffer(encryptedMsg, 'b64');
  return Promise.resolve()
    .then(() => (typeof key === 'string' ? importAESKey(key) : key))
    .then(importedKey => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encryptedMsg));
}


function importRSAKey(pk, pub = true) {
  return crypto.subtle.importKey(
    pub ? 'spki' : 'pkcs8',
    fromBase64(pk),
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' },
    },
    false,
    [pub ? 'wrapKey' : 'unwrapKey']
  );
}


export function wrapAESKey(aesKey, publicKey) {
  return Promise.resolve(
    typeof publicKey === 'string' ? importRSAKey(publicKey, true) : publicKey
  ).then(pk =>
    crypto.subtle.wrapKey('raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } })
  ).then(wrapped => toBase64(wrapped));
}


export function unwrapAESKey(aesKey, privateKey) {
  return Promise.resolve(
    typeof privateKey === 'string' ? importRSAKey(privateKey, false) : privateKey
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


export function encryptRSA(data, pubKey, aesKey) {
  return Promise.all([
    encryptAES(data, aesKey),
    wrapAESKey(aesKey, pubKey),
  ]);
}


export function decryptRSA(data, privKey) {
  const [encrypted, wrappedKey] = data;
  return unwrapAESKey(wrappedKey, privKey)
    .then(aesKey => decryptAES(encrypted, aesKey));
}
