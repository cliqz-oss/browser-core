/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import MapCache from './fixed-size-cache';

/**
 * Largely based on js-md5 (https://github.com/emn178/js-md5)
 * by Chen, Yi-Cyuan [emn178@gmail.com]
 */
/* eslint-disable no-mixed-operators, no-bitwise, no-plusplus */

const state = new Int32Array(4);
const buffer = new ArrayBuffer(68);
const buffer8 = new Uint8Array(buffer);
const blocks = new Uint32Array(buffer);
const extra = new Int32Array([128, 32768, 8388608, -2147483648]);
const hexChars = '0123456789abcdef'.split('');

let finalized = false;
let first = true;
let hashed = false;
let bytes = 0;
let start = 0;
let lastByteIndex;

function add32(a, b) {
  return (a + b) & 0xFFFFFFFF;
}

function ff(a, b, c, d, x, s, t) {
  const n = (a + (b & c | ~b & d) + (x >>> 0) + t) | 0;
  return (((n << s) | (n >>> (32 - s))) + b) | 0;
}
function gg(a, b, c, d, x, s, t) {
  const n = (a + (b & d | c & ~d) + (x >>> 0) + t) | 0;
  return (((n << s) | (n >>> (32 - s))) + b) | 0;
}
function hh(a, b, c, d, x, s, t) {
  const n = (a + (b ^ c ^ d) + (x >>> 0) + t) | 0;
  return (((n << s) | (n >>> (32 - s))) + b) | 0;
}
function ii(a, b, c, d, x, s, t) {
  const n = (a + (c ^ (b | ~d)) + (x >>> 0) + t) | 0;
  return (((n << s) | (n >>> (32 - s))) + b) | 0;
}

function hash() {
  let a;
  let b;
  let c;
  let d;

  if (first) {
    a = blocks[0] - 680876937;
    a = (a << 7 | a >>> 25) - 271733879 << 0;
    d = (-1732584194 ^ a & 2004318071) + blocks[1] - 117830708;
    d = (d << 12 | d >>> 20) + a << 0;
    c = (-271733879 ^ (d & (a ^ -271733879))) + blocks[2] - 1126478375;
    c = (c << 17 | c >>> 15) + d << 0;
    b = (a ^ (c & (d ^ a))) + blocks[3] - 1316259209;
    b = (b << 22 | b >>> 10) + c << 0;
  } else {
    a = state[0];
    b = state[1];
    c = state[2];
    d = state[3];
    a = ff(a, b, c, d, blocks[0], 7, -680876936);
    d = ff(d, a, b, c, blocks[1], 12, -389564586);
    c = ff(c, d, a, b, blocks[2], 17, 606105819);
    b = ff(b, c, d, a, blocks[3], 22, -1044525330);
  }

  a = ff(a, b, c, d, blocks[4], 7, -176418897);
  d = ff(d, a, b, c, blocks[5], 12, 1200080426);
  c = ff(c, d, a, b, blocks[6], 17, -1473231341);
  b = ff(b, c, d, a, blocks[7], 22, -45705983);
  a = ff(a, b, c, d, blocks[8], 7, 1770035416);
  d = ff(d, a, b, c, blocks[9], 12, -1958414417);
  c = ff(c, d, a, b, blocks[10], 17, -42063);
  b = ff(b, c, d, a, blocks[11], 22, -1990404162);
  a = ff(a, b, c, d, blocks[12], 7, 1804603682);
  d = ff(d, a, b, c, blocks[13], 12, -40341101);
  c = ff(c, d, a, b, blocks[14], 17, -1502002290);
  b = ff(b, c, d, a, blocks[15], 22, 1236535329);

  a = gg(a, b, c, d, blocks[1], 5, -165796510);
  d = gg(d, a, b, c, blocks[6], 9, -1069501632);
  c = gg(c, d, a, b, blocks[11], 14, 643717713);
  b = gg(b, c, d, a, blocks[0], 20, -373897302);
  a = gg(a, b, c, d, blocks[5], 5, -701558691);
  d = gg(d, a, b, c, blocks[10], 9, 38016083);
  c = gg(c, d, a, b, blocks[15], 14, -660478335);
  b = gg(b, c, d, a, blocks[4], 20, -405537848);
  a = gg(a, b, c, d, blocks[9], 5, 568446438);
  d = gg(d, a, b, c, blocks[14], 9, -1019803690);
  c = gg(c, d, a, b, blocks[3], 14, -187363961);
  b = gg(b, c, d, a, blocks[8], 20, 1163531501);
  a = gg(a, b, c, d, blocks[13], 5, -1444681467);
  d = gg(d, a, b, c, blocks[2], 9, -51403784);
  c = gg(c, d, a, b, blocks[7], 14, 1735328473);
  b = gg(b, c, d, a, blocks[12], 20, -1926607734);

  a = hh(a, b, c, d, blocks[5], 4, -378558);
  d = hh(d, a, b, c, blocks[8], 11, -2022574463);
  c = hh(c, d, a, b, blocks[11], 16, 1839030562);
  b = hh(b, c, d, a, blocks[14], 23, -35309556);
  a = hh(a, b, c, d, blocks[1], 4, -1530992060);
  d = hh(d, a, b, c, blocks[4], 11, 1272893353);
  c = hh(c, d, a, b, blocks[7], 16, -155497632);
  b = hh(b, c, d, a, blocks[10], 23, -1094730640);
  a = hh(a, b, c, d, blocks[13], 4, 681279174);
  d = hh(d, a, b, c, blocks[0], 11, -358537222);
  c = hh(c, d, a, b, blocks[3], 16, -722521979);
  b = hh(b, c, d, a, blocks[6], 23, 76029189);
  a = hh(a, b, c, d, blocks[9], 4, -640364487);
  d = hh(d, a, b, c, blocks[12], 11, -421815835);
  c = hh(c, d, a, b, blocks[15], 16, 530742520);
  b = hh(b, c, d, a, blocks[2], 23, -995338651);

  a = ii(a, b, c, d, blocks[0], 6, -198630844);
  d = ii(d, a, b, c, blocks[7], 10, 1126891415);
  c = ii(c, d, a, b, blocks[14], 15, -1416354905);
  b = ii(b, c, d, a, blocks[5], 21, -57434055);
  a = ii(a, b, c, d, blocks[12], 6, 1700485571);
  d = ii(d, a, b, c, blocks[3], 10, -1894986606);
  c = ii(c, d, a, b, blocks[10], 15, -1051523);
  b = ii(b, c, d, a, blocks[1], 21, -2054922799);
  a = ii(a, b, c, d, blocks[8], 6, 1873313359);
  d = ii(d, a, b, c, blocks[15], 10, -30611744);
  c = ii(c, d, a, b, blocks[6], 15, -1560198380);
  b = ii(b, c, d, a, blocks[13], 21, 1309151649);
  a = ii(a, b, c, d, blocks[4], 6, -145523070);
  d = ii(d, a, b, c, blocks[11], 10, -1120210379);
  c = ii(c, d, a, b, blocks[2], 15, 718787259);
  b = ii(b, c, d, a, blocks[9], 21, -343485551);

  if (first) {
    state[0] = add32(a, 1732584193);
    state[1] = add32(b, -271733879);
    state[2] = add32(c, -1732584194);
    state[3] = add32(d, +271733878);
    first = false;
  } else {
    state[0] = add32(state[0], a);
    state[1] = add32(state[1], b);
    state[2] = add32(state[2], c);
    state[3] = add32(state[3], d);
  }
}

function init() {
  blocks.fill(0);
  state.fill(0);
  bytes = 0;
  start = 0;
  finalized = false;
  first = true;
  hashed = false;
}

function update(message) {
  if (finalized) {
    return;
  }
  const length = message.length;
  let code;
  let index = 0;
  let i;

  while (index < length) {
    if (hashed) {
      hashed = false;
      blocks[0] = blocks[16];
      blocks[1] = 0;
      blocks[2] = 0;
      blocks[3] = 0;
      blocks[4] = 0;
      blocks[5] = 0;
      blocks[6] = 0;
      blocks[7] = 0;
      blocks[8] = 0;
      blocks[9] = 0;
      blocks[10] = 0;
      blocks[11] = 0;
      blocks[12] = 0;
      blocks[13] = 0;
      blocks[14] = 0;
      blocks[15] = 0;
      blocks[16] = 0;
    }

    for (i = start; index < length && i < 64; ++index) {
      code = message.charCodeAt(index);
      if (code < 0x80) {
        buffer8[i++] = code;
      } else if (code < 0x800) {
        buffer8[i++] = 0xc0 | (code >> 6);
        buffer8[i++] = 0x80 | (code & 0x3f);
      } else if (code < 0xd800 || code >= 0xe000) {
        buffer8[i++] = 0xe0 | (code >> 12);
        buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
        buffer8[i++] = 0x80 | (code & 0x3f);
      } else {
        code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
        buffer8[i++] = 0xf0 | (code >> 18);
        buffer8[i++] = 0x80 | ((code >> 12) & 0x3f);
        buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
        buffer8[i++] = 0x80 | (code & 0x3f);
      }
    }
    lastByteIndex = i;
    bytes += i - start;
    if (i >= 64) {
      start = i - 64;
      hash();
      hashed = true;
    } else {
      start = i;
    }
  }
}

function finalize() {
  if (finalized) {
    return;
  }
  finalized = true;
  const i = lastByteIndex;
  blocks[i >> 2] |= extra[i & 3];
  if (i >= 56) {
    if (!hashed) {
      hash();
    }
    blocks[0] = blocks[16];
    blocks[1] = 0;
    blocks[2] = 0;
    blocks[3] = 0;
    blocks[4] = 0;
    blocks[5] = 0;
    blocks[6] = 0;
    blocks[7] = 0;
    blocks[8] = 0;
    blocks[9] = 0;
    blocks[10] = 0;
    blocks[11] = 0;
    blocks[12] = 0;
    blocks[13] = 0;
    blocks[14] = 0;
    blocks[15] = 0;
    blocks[16] = 0;
  }
  blocks[14] = bytes << 3;
  hash();
}

function hex(x) {
  const h0 = x[0];
  const h1 = x[1];
  const h2 = x[2];
  const h3 = x[3];
  return hexChars[(h0 >> 4) & 0x0F] + hexChars[h0 & 0x0F]
    + hexChars[(h0 >> 12) & 0x0F] + hexChars[(h0 >> 8) & 0x0F]
    + hexChars[(h0 >> 20) & 0x0F] + hexChars[(h0 >> 16) & 0x0F]
    + hexChars[(h0 >> 28) & 0x0F] + hexChars[(h0 >> 24) & 0x0F]
    + hexChars[(h1 >> 4) & 0x0F] + hexChars[h1 & 0x0F]
    + hexChars[(h1 >> 12) & 0x0F] + hexChars[(h1 >> 8) & 0x0F]
    + hexChars[(h1 >> 20) & 0x0F] + hexChars[(h1 >> 16) & 0x0F]
    + hexChars[(h1 >> 28) & 0x0F] + hexChars[(h1 >> 24) & 0x0F]
    + hexChars[(h2 >> 4) & 0x0F] + hexChars[h2 & 0x0F]
    + hexChars[(h2 >> 12) & 0x0F] + hexChars[(h2 >> 8) & 0x0F]
    + hexChars[(h2 >> 20) & 0x0F] + hexChars[(h2 >> 16) & 0x0F]
    + hexChars[(h2 >> 28) & 0x0F] + hexChars[(h2 >> 24) & 0x0F]
    + hexChars[(h3 >> 4) & 0x0F] + hexChars[h3 & 0x0F]
    + hexChars[(h3 >> 12) & 0x0F] + hexChars[(h3 >> 8) & 0x0F]
    + hexChars[(h3 >> 20) & 0x0F] + hexChars[(h3 >> 16) & 0x0F]
    + hexChars[(h3 >> 28) & 0x0F] + hexChars[(h3 >> 24) & 0x0F];
}

function md5(message) {
  init();
  update(message);
  finalize();
  return hex(state);
}

const md5Cache = new MapCache(md5, 1600);

export default function cachedMD5(s) {
  if (!s) return '';
  return md5Cache.get(s);
}

/**
 * First 16 characters of md5 hash.
 * This is used in various places where increasing the chance of hash collision is a desireable
 * property.
 *
 * By truncating to 16 hex characters, a hash of 64 bits remains.
 * Expect collisions (with a likelihood of more than 50%) after
 * approximately 2^32 (4.3 billion) messages.
 *
 * @param s
 */
export function truncatedHash(s) {
  return cachedMD5(s).slice(0, 16);
}
