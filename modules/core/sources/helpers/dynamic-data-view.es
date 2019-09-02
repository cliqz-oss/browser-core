/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fromUTF8, toUTF8 } from '../../core/encoding';

/* eslint-disable no-bitwise */

/**
 * @class DynamicDataView
 *
 * This abstraction allows to serialize efficiently low-level values of types:
 * String, uint8, uint16, uint32 while hiding the complexity of managing the
 * current offset and growing. If initialized with a big enough `length`, it
 * might also not require any resize (thus enabling serializationg with a single
 * memory allocation).
 *
 * This class is also more efficient than the built-in `DataView`.
 *
 * The way this is used in practice is that you write pairs of function to
 * serialize (respectively) deserialize a given structure/class (with code being
 * pretty symetrical). In the serializer you `pushX` values, and in the
 * deserializer you use `getX` functions to get back the values.
 */
export default class DynamicDataView {
  constructor(length) {
    this.buffer = new Uint8Array(length);
    this.pos = 0;
  }

  seek(pos = 0) {
    this.pos = pos;
  }

  crop() {
    return this.buffer.subarray(0, this.pos);
  }

  set(buffer) {
    this.buffer = new Uint8Array(buffer);
    this.seek(0);
  }

  pushBytes(bytes) {
    this.checkShouldResize(bytes.byteLength);
    this.buffer.set(bytes, this.pos);
    this.pos += bytes.byteLength;
  }

  pushByte(octet) {
    this.pushUint8(octet);
  }

  pushUint8(uint8) {
    this.checkShouldResize(1);
    this.buffer[this.pos] = uint8;
    this.pos += 1;
  }

  pushUint16(uint16) {
    this.checkShouldResize(2);
    this.buffer[this.pos] = uint16 >>> 8;
    this.buffer[this.pos + 1] = uint16;
    this.pos += 2;
  }

  pushUint32(uint32) {
    this.checkShouldResize(4);
    this.buffer[this.pos] = uint32 >>> 24;
    this.buffer[this.pos + 1] = uint32 >>> 16;
    this.buffer[this.pos + 2] = uint32 >>> 8;
    this.buffer[this.pos + 3] = uint32;
    this.pos += 4;
  }

  pushUTF8(str) {
    const buffer = toUTF8(str);
    this.pushUint16(buffer.byteLength);
    this.pushBytes(buffer);
  }

  /**
   * This method is very optimistic and will assume that by default every string
   * is ascii only, but fallback to a slower utf-8 method if a non-ascii char is
   * encountered in the process of pushing the string.
   *
   * WARNING: Currently only strings of size <= 65k can be stored.
   */
  pushStr(str) {
    // Keep track of original position to be able to fallback
    // to pushUTF8 if we encounter non-ascii characters.
    const originalPos = this.pos;
    let foundUnicode = false;

    this.checkShouldResize(2 + str.length);
    this.pushUint16(str.length);

    const offset = this.pos;
    const buffer = this.buffer;
    for (let i = 0; i < str.length && !foundUnicode; i += 1) {
      const ch = str.charCodeAt(i);
      buffer[offset + i] = ch;
      foundUnicode = foundUnicode || ch > 127;
    }

    if (foundUnicode) {
      // Fallback to a slower utf-8 text encoder
      this.pos = originalPos;
      this.pushUTF8(str);
    } else {
      this.pos += str.length;
    }
  }

  // Read next value

  getBytes(n) {
    const bytes = this.buffer.subarray(this.pos, this.pos + n);
    this.pos += n;
    return bytes;
  }

  getByte() {
    return this.getUint8();
  }

  getUint8() {
    const uint8 = this.buffer[this.pos];
    this.pos += 1;
    return uint8;
  }

  getUint16() {
    const uint16 = (
      (this.buffer[this.pos] << 8)
      | this.buffer[this.pos + 1]
    ) >>> 0;
    this.pos += 2;
    return uint16;
  }

  getUint32() {
    const uint32 = (
      ((this.buffer[this.pos] << 24) >>> 0)
      + ((this.buffer[this.pos + 1] << 16)
       | (this.buffer[this.pos + 2] << 8)
        | this.buffer[this.pos + 3])
    ) >>> 0;
    this.pos += 4;
    return uint32;
  }

  getUTF8() {
    return fromUTF8(this.getBytes(this.getUint16()));
  }

  getStr() {
    // Keep track of original position to be able to fallback
    // to getUTF8 if we encounter non-ascii characters.
    const originalPos = this.pos;
    const size = this.getUint16();

    // Check if there is a non-ascii character in the string.
    let i = 0;
    for (; i < size && this.buffer[this.pos + i] <= 127; i += 1) {
      /* empty */
    }

    if (i < size) {
      this.pos = originalPos;
      return this.getUTF8();
    }

    return String.fromCharCode.apply(null, this.getBytes(size));
  }

  checkShouldResize(n) {
    if (this.pos + n >= this.buffer.byteLength) {
      this.resize(n);
    }
  }

  resize(n = 0) {
    const newBuffer = new Uint8Array(Math.floor((this.pos + n) * 1.5));
    newBuffer.set(this.buffer);
    this.buffer = newBuffer;
  }
}
/* eslint-enable no-bitwise */
