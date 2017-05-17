/* eslint-disable camelcase */

import Crypto from 'pairing/crypto';
import { inflate, deflate } from 'core/zlib';

import { base64_encode, base64_decode, hex_encode, hex_decode,
    UTF8ArrToStr, strToUTF8Arr } from 'p2p/internal/utils';

// TODO: encrypting/decrypting code is a bit complicated, maybe rewrite/refactor

// targets is an array of devices { id, publicKey }
// actually, each deviceID is just the sha256 of the publicKey, but
// let's just add this redundant info for convenience
function encryptPairedMessage({ msg, type, source }, targets) {
  const pks = targets.map(({ publicKey }) => publicKey);
  const bigMsg = strToUTF8Arr(JSON.stringify({ msg, type, source }));
  const compressed = deflate(bigMsg);
  return Crypto.encryptRSA(compressed, pks)
  .then(([[iv, encrypted], wrappedKeys]) => {
    const ivRaw = base64_decode(iv); // 12 bytes
    const encryptedRaw = base64_decode(encrypted); // Rest
    // Assuming targets ids are 32 bytes hex encoded strings, and wrapped keys
    // 256 bytes each (2048 bit, depends on RSA key size)
    const finalData = new Uint8Array(
      2 + (wrappedKeys.length * (32 + 256)) + 12 + encryptedRaw.length,
    );
    finalData[0] = 0; // Version/msg type
    // This limits the number of targets (and paired devices) to 255
    finalData[1] = wrappedKeys.length;
    for (let i = 0; i < wrappedKeys.length; i += 1) {
      const start = 2 + (i * (32 + 256));
      finalData.set(hex_decode(targets[i].id), start);
      finalData.set(base64_decode(wrappedKeys[i]), start + 32);
    }
    finalData.set(ivRaw, 2 + (wrappedKeys.length * (32 + 256)));
    finalData.set(encryptedRaw, 2 + (wrappedKeys.length * (32 + 256)) + 12);
    return finalData;
  });
}
function getMessageTargets(data) {
  // const version = data[0];
  const numKeys = data[1];
  const wrappedKeys = [];
  for (let i = 0; i < numKeys; i += 1) {
    const start = 2 + (i * (32 + 256));
    const id = hex_encode(data.subarray(start, start + 32));
    const wrappedKey = base64_encode(data.subarray(start + 32, start + 32 + 256));
    wrappedKeys.push([id, wrappedKey]);
  }
  return wrappedKeys;
}
function decryptPairedMessage(data, deviceID, privateKey) {
  const wrappedKeys = getMessageTargets(data);
  const end = 2 + (wrappedKeys.length * (32 + 256));
  const ivRaw = data.subarray(end, end + 12);
  const encryptedRaw = data.subarray(end + 12);
  const encrypted = [base64_encode(ivRaw), base64_encode(encryptedRaw)];
  const device = wrappedKeys.find(x => x[0] === deviceID);
  if (!device) {
    return Promise.reject(new Error('cannot find wrapped key when decrypting paired message'));
  }
  const wrappedKey = device[1];
  return Crypto.decryptRSA([encrypted, wrappedKey], privateKey)
  .then(compressed => JSON.parse(UTF8ArrToStr(inflate(new Uint8Array(compressed)))))
  .then(({ msg, type, source }) => ({ msg, type, source }));
}

const ERRORS = {
  PAIRING_DEVICE_NAME_EXISTING: 'PAIRING_DEVICE_NAME_EXISTING',
  PAIRING_DEVICE_NAME_TOOLONG: 'PAIRING_DEVICE_NAME_TOOLONG',
  PAIRING_PUBLICKEY_MISMATCH: 'PAIRING_PUBLICKEY_MISMATCH',
  PAIRED_DECRYPTION_ERROR: 'PAIRED_DECRYPTION_ERROR',
  PAIRING_DEVICE_NAME_EMPTY: 'PAIRING_DEVICE_NAME_EMPTY',
};

export { ERRORS, encryptPairedMessage, decryptPairedMessage, getMessageTargets };
