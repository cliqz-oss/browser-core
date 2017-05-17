import * as utils from './utils';

export default class ByteBuffer {
  constructor(length) {
    this.buffer = new Uint8Array(length);
    this.pos = 0;
  }

  setData(data) {
    this.buffer = data;
    this.pos = 0;
  }

  readByte() {
    if (this.pos + 1 > this.buffer.length) {
      throw new Error('Tried to read past the buffer length');
    }
    const pos = this.pos;
    this.pos += 1;
    return this.buffer[pos];
  }

  readBytes(length) {
    if (this.pos + length > this.buffer.length) {
      throw new Error('Tried to read past the buffer length');
    }
    const res = this.buffer.subarray(this.pos, this.pos + length);
    this.pos += length;
    return res;
  }

  resetPointer() {
    this.pos = 0;
  }

  pushByte(byte) {
    if (this.pos + 1 > this.buffer.length) {
      const newBuffer = new Uint8Array(this.buffer.length * 2);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
    const pos = this.pos;
    this.pos += 1;
    this.buffer[pos] = byte;
  }

  pushBytes(bytes) {
    if (this.pos + bytes.length > this.buffer.length) {
      const newBuffer = new Uint8Array((this.pos + bytes.length) * 2);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
    this.buffer.set(bytes, this.pos);
    this.pos += bytes.length;
  }

  toBase64() {
    return utils.base64_encode(this.buffer.subarray(0, this.pos));
  }

  fromBase64(data) {
    this.pushBytes(utils.base64_decode(data));
  }
}
