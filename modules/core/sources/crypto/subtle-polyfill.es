/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import forge from '../../platform/lib/node-forge';
import { fromBase64, toBase64 } from '../../core/encoding';
import { privateKeytoKeypair, exportPrivateKey, importPrivateKeyPKCS8 } from '../../core/crypto/pkcs-conversion';

// crypto.subtle subset implemented with forge library.

// FIXME: check data input more strictly.

function isArrayBuffer(x) {
  return x instanceof ArrayBuffer || Object.prototype.toString.call(x) === '[object ArrayBuffer]';
}

forge.util.isArrayBuffer = isArrayBuffer;

function toByteArray(data) {
  if (data.buffer) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

function toBuffer(buffer) {
  const len = buffer.length();
  const x = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    x[i] = buffer.getByte();
  }
  return x.buffer;
}

// TODO: Need to find a way to avoid using these toString, fromString functions...

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

// This assumes the internal random generator has been properly seeded (forge.random.collect)
function getRandomValues(a) {
  const view = toByteArray(a);
  const len = view.length;

  if (len > 65536) {
    throw new Error('crypto.getRandomValues: Quota exceeded');
  }

  const rnd = forge.random.getBytesSync(len);
  for (let i = 0; i < len; i += 1) {
    view[i] = rnd.charCodeAt(i);
  }
  return a;
}

function digest(params, data) {
  const name = typeof params === 'string' ? params : params.name;
  if (name === 'SHA-1') {
    const h = forge.md.sha1.create().start();
    h.update(toString(data));
    return Promise.resolve(toBuffer(h.digest()));
  }
  if (name === 'SHA-256') {
    const h = forge.md.sha256.create().start();
    h.update(toString(data));
    return Promise.resolve(toBuffer(h.digest()));
  }
  return Promise.reject(new Error('subtle.digest: unknown params'));
}

function importKey(type, data, { name, length = 256 }/* , extractable , usages */) {
  if (type === 'raw') {
    if (name === 'AES-GCM') {
      const _data = toByteArray(data);
      if (_data.length !== length / 8) {
        return Promise.reject(new Error('subtle.importKey: data length mismatch'));
      }
      return Promise.resolve({
        name,
        data
      });
    }
  } else if (name === 'RSA-OAEP' || name === 'RSASSA-PKCS1-v1_5') {
    if (type === 'spki') {
      const pem = `-----BEGIN PUBLIC KEY-----\r\n${toBase64(data)}\r\n-----END PUBLIC KEY-----\r\n`;
      const publicKey = forge.pki.publicKeyFromPem(pem);
      return Promise.resolve({ name, data: publicKey });
    }
    if (type === 'pkcs8') {
      const newKey = exportPrivateKey(importPrivateKeyPKCS8(toBase64(data)));
      const pem = `-----BEGIN RSA PRIVATE KEY-----\r\n${newKey}\r\n-----END RSA PRIVATE KEY-----\r\n`;
      const privateKey = forge.pki.privateKeyFromPem(pem);
      return Promise.resolve({ name, data: privateKey });
    }
  }
  return Promise.reject(new Error('subtle.importKey: unknown key type'));
}

function exportKey(type, key) {
  const name = key.name;
  if (type === 'raw') {
    if (name === 'AES-GCM') {
      return Promise.resolve(key.data.buffer);
    }
  } else if (name === 'RSA-OAEP' || name === 'RSASSA-PKCS1-v1_5') {
    if (type === 'spki') {
      const exported = forge.pki.publicKeyToPem(key.data)
        .split('\r\n')
        .slice(1, -2)
        .join('');
      return Promise.resolve(fromBase64(exported).buffer);
    }
    if (type === 'pkcs8') {
      const exported = forge.pki.privateKeyToPem(key.data)
        .split('\r\n')
        .slice(1, -2)
        .join('');
      const privateKey = privateKeytoKeypair(exported)[1];
      return Promise.resolve(fromBase64(privateKey).buffer);
      // private
    }
  }
  return Promise.reject(new Error('subtle.exportKey: unknown key type'));
}

function encrypt({ name, iv, additionalData = undefined, tagLength = 128 }, key, data) {
  if (name === 'AES-GCM') {
    const cipher = forge.cipher.createCipher('AES-GCM', toString(key.data));
    cipher.start({
      iv: toString(iv),
      additionalData: additionalData && toString(additionalData),
      tagLength,
    });
    cipher.update(forge.util.createBuffer(data));
    cipher.finish();
    const output = new Uint8Array(toBuffer(cipher.output));
    const tag = new Uint8Array(toBuffer(cipher.mode.tag));
    const final = new Uint8Array(output.length + tag.length);
    final.set(output);
    final.set(tag, output.length);
    return Promise.resolve(final.buffer);
  }
  if (name === 'RSA-OAEP') {
    return Promise.resolve(fromString(key.data.encrypt(toString(data), 'RSA-OAEP',
      {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create()
        }
      })).buffer);
  }
  return Promise.reject(new Error('subtle.encrypt: Unknown cipher'));
}

function decrypt({ name, iv, additionalData = undefined, tagLength = 128 }, key, data) {
  if (name === 'AES-GCM') {
    const _data = toByteArray(data);
    const encrypted = _data.subarray(0, _data.byteLength - (tagLength / 8));
    const tag = _data.subarray(_data.byteLength - (tagLength / 8));
    const cipher = forge.cipher.createCipher('AES-GCM', toString(key.data));
    cipher.start({
      iv: toString(iv),
      additionalData: additionalData && toString(additionalData),
      tagLength,
      tag: toString(tag),
    });
    cipher.update(forge.util.createBuffer(encrypted));
    const pass = cipher.finish();
    if (!pass) {
      return Promise.reject(new Error('subtle.decrypt: auth did not match'));
    }
    return Promise.resolve(toBuffer(cipher.output));
  }
  if (name === 'RSA-OAEP') {
    return Promise.resolve(fromString(key.data.decrypt(toString(data), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    })));
  }
  return Promise.reject(new Error('subtle.decrypt: Unknown cipher'));
}

function wrapKey(type, key, publicKey, { name, hash }) {
  return exportKey(type, key)
    .then(data => encrypt({ name, hash }, publicKey, data));
}

function unwrapKey(type, data, pk, options, wrappedOptions, extractable, usages) {
  return decrypt(options, pk, data)
    .then(decrypted => importKey(type, decrypted, wrappedOptions, extractable, usages));
}

// TODO: RSA key generation will be really slow, and blocking. Need to move to
// workers or native (better).
function generateKey({
  name,
  length = null,
  modulusLength = null,
  publicExponent = null
}/* , extractable , usages */) {
  if (name === 'AES-GCM') {
    return Promise.resolve({
      name,
      data: getRandomValues(new Uint8Array(length / 8)),
    });
  }
  if (name === 'RSA-OAEP' || name === 'RSASSA-PKCS1-v1_5') {
    const _e = toByteArray(publicExponent || new Uint8Array([0x01, 0x00, 0x01]));
    const e = (new forge.jsbn.BigInteger(_e)).intValue();

    // Very slow...
    const keypair = forge.rsa.generateKeyPair({ bits: modulusLength, e });
    return Promise.resolve({
      privateKey: {
        name,
        data: keypair.privateKey,
      },
      publicKey: {
        name,
        data: keypair.publicKey,
      },
    });
  }
  return Promise.reject(new Error('subtle.generateKey: unknown algo name'));
}

function sign(_, key, data) {
  const md = forge.md.sha256.create();
  md.update(toString(data));
  return Promise.resolve(fromString(key.data.sign(md)).buffer);
}

function verify(_, key, sig, data) {
  return digest('SHA-256', data)
    .then(h => key.data.verify(toString(h), toString(sig)));
}

function _seed(bytes) {
  let md = forge.md.sha256.create();
  md.update(toString(bytes));

  function getRandBytes(len) {
    const output = [];
    let n = 0;
    while (n < len) {
      const dig = md.digest().getBytes();
      md = forge.md.sha256.create().update(dig);
      output.push(dig);
      n += 32;
    }
    return output.join().slice(0, len);
  }

  // Internally, there are 32 pools, so 1024 bytes ensures that first pool will
  // have 32 bytes of entropy
  forge.random.collect(getRandBytes(256));
  forge.random.collect(forge.random.seedFileSync(512));
  forge.random.collect(getRandBytes(256));
}

export default {
  digest,
  importKey,
  exportKey,
  generateKey,
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
  verify,
  sign,
  _seed,
  _getRandomValues: getRandomValues,
};
