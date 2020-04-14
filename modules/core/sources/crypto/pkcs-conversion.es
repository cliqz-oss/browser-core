/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */

import { toBase64, fromBase64 } from '../encoding';
import DynamicDataView from '../helpers/dynamic-data-view';

function bytesToEncode(len) {
  let sum = len + 1;
  if (len < (1 << 7)) {
    sum += 1;
  } else if (len < (1 << 8)) {
    sum += 2;
  } else if (len < (1 << 16)) {
    sum += 3;
  } else if (len < (1 << 24)) {
    sum += 4;
  } else if (len <= 2147483647) { // < 2**31
    sum += 5;
  } else {
    throw new Error(`value too big ${len}`);
  }
  return sum;
}

function pushLength(buffer, len) {
  if (len < (1 << 7)) {
    buffer.pushByte(len);
  } else if (len < (1 << 8)) {
    buffer.pushByte(0x81);
    buffer.pushByte(len);
  } else if (len < (1 << 16)) {
    buffer.pushByte(0x82);
    buffer.pushByte(len >> 8);
    buffer.pushByte(len & 0xFF);
  } else if (len < (1 << 24)) {
    buffer.pushByte(0x83);
    buffer.pushByte(len >> 16);
    buffer.pushByte((len >> 8) & 0xFF);
    buffer.pushByte(len & 0xFF);
  } else if (len <= 2147483647) { // < 2**31
    buffer.pushByte(0x84);
    buffer.pushByte(len >> 24);
    buffer.pushByte((len >> 16) & 0xFF);
    buffer.pushByte((len >> 8) & 0xFF);
    buffer.pushByte(len & 0xFF);
  } else {
    throw new Error(`value too big ${len}`);
  }
}

function fromBase64url(data) {
  data = data.replace(/-/g, '+').replace(/_/g, '/');
  const pads = (4 - (data.length % 4)) % 4;
  if (pads === 3) {
    throw new Error(`illegal base64 string: ${data}`);
  }
  for (let i = 0; i < pads; i++) {
    data += '=';
  }
  return data;
}


function toBase64url(data) {
  data = data.replace(/\+/g, '-').replace(/\//g, '_');
  for (let i = 0; i < 2; ++i) {
    if (data[data.length - 1] === '=') {
      data = data.substring(0, data.length - 1);
    }
  }
  return data;
}

function padIfSigned(array) {
  if (array[0] & 0x80) {
    const newArray = new Uint8Array(array.length + 1);
    newArray[0] = 0;
    newArray.set(array, 1);
    return newArray;
  }
  return array;
}
/* RSAPrivateKey ::= SEQUENCE {
  version           0,
  modulus           INTEGER,  -- n
  publicExponent    INTEGER,  -- e
  privateExponent   INTEGER,  -- d
  prime1            INTEGER,  -- p
  prime2            INTEGER,  -- q
  exponent1         INTEGER,  -- d mod (p-1)
  exponent2         INTEGER,  -- d mod (q-1)
  coefficient       INTEGER,  -- (inverse of q) mod p
} */

/* RSAPublicKey ::= SEQUENCE {
    modulus           INTEGER,  -- n
    publicExponent    INTEGER   -- e
} */
function exportPrivateKey(key) {
  const origValues = ['AA==', key.n, key.e, key.d, key.p, key.q, key.dp, key.dq, key.qi];
  const values = origValues.map(x => padIfSigned(fromBase64(fromBase64url(x))));
  const buffer = new DynamicDataView(2000);

  buffer.pushByte(0x30); // SEQUENCE
  const numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);
  pushLength(buffer, numBytes);

  values.forEach((x) => {
    buffer.pushByte(0x02); // INTEGER
    pushLength(buffer, x.length);
    buffer.pushBytes(x);
  });
  return toBase64(buffer.crop());
}
function exportPublicKeySimple(key) {
  const origValues = [key.n, key.e];
  const values = origValues.map(x => padIfSigned(fromBase64(fromBase64url(x))));
  const buffer = new DynamicDataView(2000);

  buffer.pushByte(0x30); // SEQUENCE
  const numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);
  pushLength(buffer, numBytes);

  values.forEach((x) => {
    buffer.pushByte(0x02); // INTEGER
    pushLength(buffer, x.length);
    buffer.pushBytes(x);
  });
  return toBase64(buffer.crop());
}
/* RSAPublicKey ::= SEQUENCE {
    modulus           INTEGER,  -- n
    publicExponent    INTEGER   -- e
} */


/* SEQUENCE(2 elem)
    SEQUENCE(2 elem)
        OBJECT IDENTIFIER 1.2.840.113549.1.1.1
        NULL
    BIT STRING(1 elem)
        SEQUENCE(2 elem)
            INTEGER(2048 bit) n
            INTEGER e
*/
function exportPublicKey(key) {
  const origValues = [key.n, key.e];
  const values = origValues.map(x => padIfSigned(fromBase64(fromBase64url(x))));
  const numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);

  const buffer = new DynamicDataView(2000);

  buffer.pushByte(0x30); // SEQUENCE
  pushLength(buffer, bytesToEncode(bytesToEncode(numBytes) + 1) + 15);

  buffer.pushBytes(new Uint8Array([
    0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]));
  buffer.pushByte(0x03); // BIT STRING
  pushLength(buffer, bytesToEncode(numBytes) + 1);
  buffer.pushByte(0x00);

  buffer.pushByte(0x30); // SEQUENCE
  pushLength(buffer, numBytes);

  values.forEach((x) => {
    buffer.pushByte(0x02); // INTEGER
    pushLength(buffer, x.length);
    buffer.pushBytes(x);
  });
  return toBase64(buffer.crop());
}

function exportPublicKeySPKI(key) {
  return exportPublicKey(key);
}

function exportPrivateKeyPKCS8(key) {
  const origValues = ['AA==', key.n, key.e, key.d, key.p, key.q, key.dp, key.dq, key.qi];
  const values = origValues.map(x => padIfSigned(fromBase64(fromBase64url(x))));
  const numBytes = values.reduce((a, x) => a + bytesToEncode(x.length), 0);

  const buffer = new DynamicDataView(2000);

  buffer.pushByte(0x30); // SEQUENCE
  pushLength(buffer, 3 + 15 + bytesToEncode(bytesToEncode(numBytes)));
  buffer.pushBytes(new Uint8Array([0x02, 0x01, 0x00]));
  buffer.pushBytes(new Uint8Array([
    0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]));
  buffer.pushByte(0x04); // OCTET STRING
  pushLength(buffer, bytesToEncode(numBytes));

  buffer.pushByte(0x30); // SEQUENCE
  pushLength(buffer, numBytes);

  values.forEach((x) => {
    buffer.pushByte(0x02); // INTEGER
    pushLength(buffer, x.length);
    buffer.pushBytes(x);
  });
  return toBase64(buffer.crop());
}

function readLength(buffer) {
  const first = buffer.getByte();
  if (first & 0x80) {
    let numBytes = first & 0x7F;
    let res = 0;
    while (numBytes--) {
      res = (res << 8) | buffer.getByte();
    }
    return res;
  }
  return first;
}

function readInteger(buffer) {
  const tag = buffer.getByte();
  if (tag !== 0x02) {
    throw new Error('invalid tag for integer value');
  }
  const len = readLength(buffer);
  let val = buffer.getBytes(len);
  if (val[0] === 0) { // Remove padding?
    val = val.subarray(1);
  }
  return val;
}

function __importKey(buffer, values) {
  const key = {};
  if (buffer.getByte() === 0x30) {
    readLength(buffer);
    for (let i = 0; i < values.length; ++i) {
      let val = readInteger(buffer);
      val = toBase64url(toBase64(val));
      key[values[i]] = val;
    }
  } else {
    throw new Error('first value not correct');
  }

  key.alg = 'RS256';
  key.ext = true;
  key.kty = 'RSA';
  return key;
}

function _importKey(data, values) {
  const buffer = new DynamicDataView(0);
  buffer.set(fromBase64(data));
  return __importKey(buffer, values);
}

function importPublicKey(data) {
  const buffer = new DynamicDataView(0);
  buffer.set(fromBase64(data));
  if (buffer.getByte() === 0x30) {
    readLength(buffer);
    buffer.getBytes(15);
    if (buffer.getByte() !== 0x03) {
      throw new Error('format not correct');
    }
    readLength(buffer);
    if (buffer.getByte() !== 0x00) {
      throw new Error('format not correct');
    }
  } else {
    throw new Error('format not correct');
  }
  return __importKey(buffer, ['n', 'e']);
}

function importPrivateKeyPKCS8(data) {
  const buffer = new DynamicDataView(0);
  buffer.set(fromBase64(data));
  buffer.getByte();
  readLength(buffer);
  buffer.getBytes(3);
  buffer.getBytes(15);
  buffer.getByte();
  readLength(buffer);
  const res = __importKey(buffer, ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']);
  delete res.version;
  return res;
}

function importPrivateKey(data) {
  const res = _importKey(data, ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']);
  delete res.version;
  return res;
}

function privateKeytoKeypair(privateKey) {
  const key = importPrivateKey(privateKey);
  return [exportPublicKeySPKI(key), exportPrivateKeyPKCS8(key)];
}

export { importPrivateKeyPKCS8, exportPrivateKeyPKCS8, exportPrivateKey, exportPublicKey,
  exportPublicKeySPKI, importPublicKey, importPrivateKey, privateKeytoKeypair,
  exportPublicKeySimple };
