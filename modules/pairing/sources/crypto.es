/* eslint-disable camelcase */

import crypto from 'platform/crypto';

import { base64_encode, base64_decode, hex_encode, hex_decode,
    UTF8ArrToStr, strToUTF8Arr } from 'p2p/internal/utils';

import { exportPrivateKey, exportPublicKey } from 'p2p/internal/crypto';

export default class CliqzCrypto {
  static sha256(str, format = 'hex') {
    return CliqzCrypto.hash('SHA-256', str, format);
  }
  static hash(algo, str, format = 'hex') {
    return crypto.subtle.digest(algo, typeof str === 'string' ? strToUTF8Arr(str) : str)
    .then(hash => CliqzCrypto.fromArrayBuffer(hash, format));
  }
  static fromByteArray(data, format) {
    if (format === 'hex') {
      return hex_encode(data);
    } else if (format === 'b64') {
      return base64_encode(data);
    }
    return data;
  }
  static toByteArray(data, format) {
    if (format === 'hex') {
      return hex_decode(data);
    } else if (format === 'b64') {
      return base64_decode(data);
    }
    return data;
  }
  static fromArrayBuffer(data, format) {
    return CliqzCrypto.fromByteArray(new Uint8Array(data), format);
  }
  static toArrayBuffer(data, format) {
    return CliqzCrypto.toByteArray(data, format).buffer;
  }
  static encryptAES(data, key, iv) {
    return Promise.all([
      iv || crypto.getRandomValues(new Uint8Array(12)),
      typeof key === 'string' ? CliqzCrypto.importAESKey(key) : key,
    ])
    .then(([_iv, _key]) =>
      crypto.subtle.encrypt({ name: 'AES-GCM', iv: _iv }, _key, data)
      .then(encrypted =>
        [CliqzCrypto.fromArrayBuffer(_iv, 'b64'), CliqzCrypto.fromArrayBuffer(encrypted, 'b64')],
      ),
    );
  }
  // Returns [IV, encryptedData]
  static encryptStringAES(txt, key, iv) {
    return CliqzCrypto.encryptAES(strToUTF8Arr(txt).buffer, key, iv);
  }
  static decryptAES(encrypted, key) {
    let iv = encrypted[0];
    let encryptedMsg = encrypted[1];
    iv = new Uint8Array(CliqzCrypto.toArrayBuffer(iv, 'b64'));
    encryptedMsg = CliqzCrypto.toArrayBuffer(encryptedMsg, 'b64');
    return Promise.resolve()
    .then(() => (typeof key === 'string' ? CliqzCrypto.importAESKey(key) : key))
    .then(importedKey => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encryptedMsg));
  }
  static decryptStringAES(encrypted, key) {
    return CliqzCrypto.decryptAES(encrypted, key)
    .then(decrypted => UTF8ArrToStr(new Uint8Array(decrypted)));
  }
  static generateAESKey() {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
    );
  }
  static exportAESKey(key) {
    return crypto.subtle.exportKey('raw', key)
    .then(_key => CliqzCrypto.fromArrayBuffer(_key, 'hex'));
  }
  static importAESKey(key) {
    return crypto.subtle.importKey('raw', CliqzCrypto.toArrayBuffer(key, 'hex'),
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  static importRSAKey(pk, pub = true, hash = 'SHA-256') {
    return crypto.subtle.importKey(
      pub ? 'spki' : 'pkcs8',
      base64_decode(pk),
      {
        name: 'RSA-OAEP',
        hash: { name: hash },
      },
      false,
      pub ? ['wrapKey', 'encrypt'] : ['unwrapKey', 'decrypt'],
    );
  }
  static wrapAESKey(aesKey, publicKey) {
    return Promise.resolve(
      typeof publicKey === 'string' ? CliqzCrypto.importRSAKey(publicKey, true) : publicKey,
    )
    .then(pk =>
      crypto.subtle.wrapKey('raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } }),
    )
    .then(wrapped => base64_encode(wrapped));
  }
  static unwrapAESKey(aesKey, privateKey) {
    return Promise.resolve(
      typeof privateKey === 'string' ? CliqzCrypto.importRSAKey(privateKey, false) : privateKey,
    )
    .then(pk =>
      crypto.subtle.unwrapKey(
        'raw',
        base64_decode(aesKey),
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
  static encryptStringRSA(txt, publicKey) {
    return CliqzCrypto.generateAESKey()
    .then((aesKey) => {
      let promise;
      if (Array.isArray(publicKey)) {
        promise = Promise.all(publicKey.map(x => CliqzCrypto.wrapAESKey(aesKey, x)));
      } else {
        promise = CliqzCrypto.wrapAESKey(aesKey, publicKey);
      }
      return Promise.all([
        CliqzCrypto.encryptStringAES(txt, aesKey),
        promise,
      ]);
    });
  }
  static rawEncryptRSA(data, publicKey) {
    return CliqzCrypto.importRSAKey(publicKey, true, 'SHA-1')
    .then(key => crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data))
    .then(d => new Uint8Array(d));
  }
  static encryptRSA(data, publicKey) {
    return CliqzCrypto.generateAESKey()
    .then((aesKey) => {
      let promise;
      if (Array.isArray(publicKey)) {
        promise = Promise.all(publicKey.map(x => CliqzCrypto.wrapAESKey(aesKey, x)));
      } else {
        promise = CliqzCrypto.wrapAESKey(aesKey, publicKey);
      }
      return Promise.all([
        CliqzCrypto.encryptAES(data, aesKey),
        promise,
      ]);
    });
  }
  static decryptRSA(data, privateKey) {
    const [encrypted, wrappedKey] = data;
    return CliqzCrypto.unwrapAESKey(wrappedKey, privateKey)
      .then(aesKey => CliqzCrypto.decryptAES(encrypted, aesKey));
  }
  static decryptStringRSA(data, privateKey) {
    const [encrypted, wrappedKey] = data;
    return CliqzCrypto.unwrapAESKey(wrappedKey, privateKey)
      .then(aesKey => CliqzCrypto.decryptStringAES(encrypted, aesKey));
  }

  // TODO: Need to refactor, ignore these two functions
  static exportPrivateKey(key) {
    return exportPrivateKey(key);
  }
  static exportPublicKey(key) {
    return exportPublicKey(key);
  }

  static randomBytes(numBytes) {
    return crypto.getRandomValues(new Uint8Array(numBytes));
  }

  static deriveAESKey(randomBytes) {
    return CliqzCrypto.sha256(randomBytes, 'raw')
    .then(hash =>
      crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']),
    );
  }
}
