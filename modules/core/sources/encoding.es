/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-sparse-arrays */

import TextEncoder from '../platform/text-encoder';
import TextDecoder from '../platform/text-decoder';

function toByteArray(data) {
  if (data.buffer) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

/* Encodes a Uint8Array as a base64 string */
function toBase64Fast(data) {
  data = toByteArray(data);
  const CHUNK_SIZE = 32767;
  const c = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    c.push(String.fromCharCode.apply(null, data.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(c.join(''));
}

/* Decodes a base64 string as a Uint8Array */
function fromBase64Fast(data) {
  const dec = atob(data);
  const len = dec.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = dec.charCodeAt(i);
  }
  return bytes;
}

/* toBase64 without using btoa */
function toBase64Slow(data) {
  data = toByteArray(data);
  const modtable = [0, 2, 1];
  const enctable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const inlength = data.byteLength;
  const outlength = 4 * (Math.floor((inlength + 2) / 3));

  const encdata = new Array(outlength);

  for (let i = 0, j = 0; i < inlength;) {
    const octa = i < inlength ? data[i++] : 0;
    const octb = i < inlength ? data[i++] : 0;
    const octc = i < inlength ? data[i++] : 0;

    const triple = (octa << 0x10) + (octb << 0x08) + octc;

    encdata[j++] = enctable[(triple >> 3 * 6) & 0x3F];
    encdata[j++] = enctable[(triple >> 2 * 6) & 0x3F];
    encdata[j++] = enctable[(triple >> 1 * 6) & 0x3F];
    encdata[j++] = enctable[(triple >> 0 * 6) & 0x3F];
  }

  for (let i = 0; i < modtable[inlength % 3]; i++) {
    encdata[outlength - 1 - i] = '=';
  }

  return encdata.join('');
}

/* fromBase64 without using atob */
function fromBase64Slow(data) {
  const dectable = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 62,,,, 63, 52, 53, 54, 55, 56,
    57, 58, 59, 60, 61,,,,,,,, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24, 25,,,,,,, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];

  const inlength = data.length;
  if (inlength % 4 !== 0) {
    return null;
  }

  let outlength = Math.floor(inlength / 4) * 3;
  if (data[inlength - 1] === '=') {
    outlength--;
  }
  if (data[inlength - 2] === '=') {
    outlength--;
  }

  const decdata = new Uint8Array(outlength);
  for (let i = 0, j = 0; i < inlength;) {
    const sexta = data[i] === '=' ? 0 & i++ : dectable[data[i++].charCodeAt()];
    const sextb = data[i] === '=' ? 0 & i++ : dectable[data[i++].charCodeAt()];
    const sextc = data[i] === '=' ? 0 & i++ : dectable[data[i++].charCodeAt()];
    const sextd = data[i] === '=' ? 0 & i++ : dectable[data[i++].charCodeAt()];

    const triple = (sexta << 3 * 6) + (sextb << 2 * 6) +
      (sextc << 1 * 6) + (sextd << 0 * 6);
    if (j < outlength) {
      decdata[j++] = (triple >> 2 * 8) & 0xFF;
    }
    if (j < outlength) {
      decdata[j++] = (triple >> 1 * 8) & 0xFF;
    }
    if (j < outlength) {
      decdata[j++] = (triple >> 0 * 8) & 0xFF;
    }
  }
  return decdata;
}

/* Encodes a Uint8Array as an hex string */
function toHex(data) {
  data = toByteArray(data);
  const enctablehex = '0123456789abcdef';
  const inlength = data.byteLength;
  const encdata = [];
  for (let i = 0; i < inlength; ++i) {
    encdata[2 * i] = enctablehex[data[i] >> 4];
    encdata[(2 * i) + 1] = enctablehex[data[i] & 0x0F];
  }
  return encdata.join('');
}

/* Decodes an hex string as a Uint8Array */
function fromHex(data) {
  const dectablehex = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 0, 1, 2, 3, 4, 5, 6,
    7, 8, 9,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 10, 11, 12, 13, 14, 15];

  data = data.toLowerCase();
  if (data.length % 2 !== 0) {
    throw new Error(`fromHex: ${data} has odd length`);
  }
  const outlength = data.length / 2;
  const decdata = new Uint8Array(outlength);
  for (let i = 0; i < outlength; i++) {
    decdata[i] =
      (dectablehex[data[2 * i].charCodeAt()] << 4) |
      (dectablehex[data[(2 * i) + 1].charCodeAt()]);
  }
  return decdata;
}

/* Returns a string given a Uint8Array UTF-8 encoding */
const decoder = new TextDecoder();
function fromUTF8(bytes) {
  return decoder.decode(toByteArray(bytes));
}

/* Returns a Uint8Array UTF-8 encoding of the given string */
const encoder = new TextEncoder();
function toUTF8(str) {
  return encoder.encode(str);
}

const toBase64 = typeof btoa !== 'undefined' ? toBase64Fast : toBase64Slow;
const fromBase64 = typeof atob !== 'undefined' ? fromBase64Fast : fromBase64Slow;
export { toBase64, fromBase64, toHex, fromHex, toUTF8, fromUTF8 };
