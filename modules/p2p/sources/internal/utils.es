/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-sparse-arrays */

import TextEncoder from 'platform/text-encoder';
import TextDecoder from 'platform/text-decoder';

const encoding_table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decoding_table = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 62,,,, 63, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61,,,,,,,, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25,,,,,,, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];
const encoding_table_hex = '0123456789abcdef';
const decoding_table_hex = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 0, 1, 2, 3, 4, 5, 6,
  7, 8, 9,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, 10, 11, 12, 13, 14, 15];
const mod_table = [0, 2, 1];

// Returns base64 encoded string, expects Uint8Array
function base64_encode(data) {
  if (!data.buffer) {
    data = new Uint8Array(data);
  }
  const input_length = data.byteLength;
  const output_length = 4 * (Math.floor((input_length + 2) / 3));

  const encoded_data = new Array(output_length);

  for (let i = 0, j = 0; i < input_length;) {
    const octet_a = i < input_length ? data[i++] : 0;
    const octet_b = i < input_length ? data[i++] : 0;
    const octet_c = i < input_length ? data[i++] : 0;

    const triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

    encoded_data[j++] = encoding_table[(triple >> 3 * 6) & 0x3F];
    encoded_data[j++] = encoding_table[(triple >> 2 * 6) & 0x3F];
    encoded_data[j++] = encoding_table[(triple >> 1 * 6) & 0x3F];
    encoded_data[j++] = encoding_table[(triple >> 0 * 6) & 0x3F];
  }

  for (let i = 0; i < mod_table[input_length % 3]; i++) {
    encoded_data[output_length - 1 - i] = '=';
  }

  return encoded_data.join('');
}

// Returns Uint8Array, expects base64 encoded string
function base64_decode(data) {
  const input_length = data.length;
  if (input_length % 4 !== 0) {
    return null;
  }

  let output_length = Math.floor(input_length / 4) * 3;
  if (data[input_length - 1] === '=') {
    output_length--;
  }
  if (data[input_length - 2] === '=') {
    output_length--;
  }

  const decoded_data = new Uint8Array(output_length);
  for (let i = 0, j = 0; i < input_length;) {
    const sextet_a = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
    const sextet_b = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
    const sextet_c = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];
    const sextet_d = data[i] === '=' ? 0 & i++ : decoding_table[data[i++].charCodeAt()];

    const triple = (sextet_a << 3 * 6) + (sextet_b << 2 * 6) +
      (sextet_c << 1 * 6) + (sextet_d << 0 * 6);
    if (j < output_length) {
      decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
    }
    if (j < output_length) {
      decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
    }
    if (j < output_length) {
      decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
    }
  }
  return decoded_data;
}

function hex_encode(data) {
  if (!data.buffer) {
    data = new Uint8Array(data);
  }
  const input_length = data.byteLength;
  const output_length = 2 * input_length;
  const encoded_data = new Array(output_length);
  for (let i = 0; i < input_length; ++i) {
    encoded_data[2 * i] = encoding_table_hex[data[i] >> 4];
    encoded_data[(2 * i) + 1] = encoding_table_hex[data[i] & 0x0F];
  }
  return encoded_data.join('');
}

function hex_decode(data) {
  data = data.toLowerCase();
  const output_length = data.length / 2;
  const decoded_data = new Uint8Array(output_length);
  for (let i = 0; i < output_length; i++) {
    decoded_data[i] =
      (decoding_table_hex[data[2 * i].charCodeAt()] << 4) |
      (decoding_table_hex[data[(2 * i) + 1].charCodeAt()]);
  }
  return decoded_data;
}

function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isArrayBuffer(x) {
  return x instanceof ArrayBuffer || Object.prototype.toString.call(x) === '[object ArrayBuffer]';
}

function UTF8ArrToStr(aBytes) {
  return (new TextDecoder()).decode(aBytes);
}

function strToUTF8Arr(sDOMStr) {
  return (new TextEncoder()).encode(sDOMStr);
}

export { base64_encode, base64_decode, hex_encode, hex_decode,
has, isArrayBuffer, UTF8ArrToStr, strToUTF8Arr };
