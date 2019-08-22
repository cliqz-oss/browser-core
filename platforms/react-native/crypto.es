/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules } from 'react-native';
import subtle from '../core/crypto/subtle-polyfill';
import forge from '../platform/lib/node-forge';
import { importPrivateKey, importPrivateKeyPKCS8, exportPrivateKey, exportPrivateKeyPKCS8, exportPublicKeySPKI, importPublicKey, exportPublicKeySimple } from '../core/crypto/pkcs-conversion';
import { fromBase64, toBase64 } from '../core/encoding';

const Crypto = NativeModules.Crypto;

const oldGenerateKey = subtle.generateKey.bind(subtle);
const oldEncrypt = subtle.encrypt.bind(subtle);
const oldDecrypt = subtle.decrypt.bind(subtle);
const oldSign = subtle.sign.bind(subtle);

function toByteArray(data) {
  if (data.buffer) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

function toString(data) {
  return String.fromCharCode.apply(null, toByteArray(data));
}

function fromString(data) {
  const res = new Uint8Array(data.length);
  const len = data.length;
  for (let i = 0; i < len; i += 1) {
    res[i] = data.charCodeAt(i);
  }
  return res;
}

function subtleImportPublicKey(key, s) {
  return s.importKey(
    'spki',
    key,
    { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
    true,
    ['encrypt', 'wrapKey']
  );
}

function subtleImportPrivateKey(key, s) {
  return s.importKey(
    'pkcs8',
    key,
    { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
    true,
    ['decrypt', 'unwrapKey']
  );
}

// TODO: shold clone subtle?
subtle.generateKey = ({
  name,
  length = null,
  modulusLength = null,
  publicExponent = null
}/* , extractable , usages */) => {
  if (Crypto && Crypto.generateRSAKey && (name === 'RSA-OAEP' || name === 'RSASSA-PKCS1-v1_5')) {
    return Crypto.generateRSAKey()
      .then((key) => {
        try {
          return importPrivateKey(key);
        } catch (e) {
          // pass
        }
        return importPrivateKeyPKCS8(key);
      })
      .then((key) => {
        const priv = exportPrivateKeyPKCS8(key);
        const pub = exportPublicKeySPKI(key);
        return Promise.all([
          subtleImportPrivateKey(fromBase64(priv), subtle),
          subtleImportPublicKey(fromBase64(pub), subtle)
        ]);
      })
      .then(([privateKey, publicKey]) => ({ privateKey, publicKey }));
  }
  return oldGenerateKey({ name, length, modulusLength, publicExponent });
};

subtle.encrypt = ({ name, iv, additionalData = undefined, tagLength = 128 }, key, data) => {
  if (Crypto && Crypto.encryptRSA && name === 'RSA-OAEP') {
    // OAEP padding in JS, raw encryption in native.
    const options = {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    };
    const padded = toBase64(fromString(forge.pkcs1.encode_rsa_oaep(
      key.data,
      toString(data),
      options
    )));
    return subtle.exportKey('spki', key)
      .then(toBase64)
      .then(importPublicKey)
      .then(exportPublicKeySimple)
      .then(k => Crypto.encryptRSA(padded, k))
      .then(x => fromBase64(x).buffer)
      .catch(() => oldEncrypt({ name, iv, additionalData, tagLength }, key, data));
  }
  return oldEncrypt({ name, iv, additionalData, tagLength }, key, data);
};

subtle.decrypt = ({ name, iv, additionalData = undefined, tagLength = 128 }, key, data) => {
  if (Crypto && Crypto.decryptRSA && name === 'RSA-OAEP') {
    // raw decryption in native, OAEP unpadding in JS.
    const options = {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    };
    return subtle.exportKey('pkcs8', key)
      .then(toBase64)
      .then(importPrivateKeyPKCS8)
      .then(exportPrivateKey)
      .then(k => Crypto.decryptRSA(toBase64(data), k))
      .then((x) => {
        const bytes = Math.ceil(key.data.n.bitLength() / 8);
        const oldData = fromBase64(x);
        const newData = new Uint8Array(bytes);
        const diff = bytes - oldData.length;
        for (let i = diff; i < bytes; i += 1) {
          newData[i] = oldData[i - diff];
        }
        return toBase64(newData);
      })
      .then(x => forge.pkcs1.decode_rsa_oaep(
        key.data,
        toString(fromBase64(x)),
        options
      ))
      .then(x => fromString(x).buffer)
      .catch(() => oldDecrypt({ name, iv, additionalData, tagLength }, key, data));
  }
  return oldDecrypt({ name, iv, additionalData, tagLength }, key, data);
};

subtle.wrapKey = (type, key, publicKey, { name, hash }) =>
  subtle.exportKey(type, key)
    .then(data => subtle.encrypt({ name, hash }, publicKey, data));

subtle.unwrapKey = (type, data, pk, options, wrappedOptions, extractable, usages) =>
  subtle.decrypt(options, pk, data)
    .then(decrypted => subtle.importKey(type, decrypted, wrappedOptions, extractable, usages));

subtle.sign = ({ name }, key, data) => {
  const md = forge.md.sha256.create();
  md.update(toString(data));
  const raw = toBase64(fromString(md.digest().getBytes()));

  return subtle.exportKey('pkcs8', key)
    .then(toBase64)
    .then(importPrivateKeyPKCS8)
    .then(exportPrivateKey)
    .then(k => Crypto.signRSA(raw, k))
    .then(x => fromBase64(x).buffer)
    .catch(() => oldSign({ name }, key, data));
};

export default {
  subtle,
  getRandomValues: subtle._getRandomValues,
};
