import { encryptRSA, decryptRSA } from '../core/crypto/utils';
import { inflate, deflate } from '../core/zlib';
import { toBase64, fromBase64, toHex, fromHex, toUTF8, fromUTF8 } from '../core/encoding';

const MsgTypes = {
  ENCRYPTED: 0,
  COMPRESSED: 1,
};

// Encrypted msg format:
//  type === ENCRYPTED === 0
//    [type (1 byte)]
//    [targets_len (1 byte)]
//    targets_len * ([target_id (32 bytes)] [rsa_oaep_wrapped_key (256 bytes)])
//    [AES IV (12 bytes)]
//    [Deflated-then-AES-GCM-encrypted data]

//  type === COMPRESSED === 1
//    [type (1 byte)]
//    [targets_len (1 byte)]
//    targets_len * ([target_id (32 bytes)])
//    [Deflated data]

function encryptPairedMessage({ msg, type, source }, targets, onlyCompress = false) {
  const pks = targets.map(({ publicKey }) => publicKey);
  const bigMsg = toUTF8(JSON.stringify({ msg, type, source }));
  const compressed = deflate(bigMsg);
  if (onlyCompress) {
    const finalData = new Uint8Array(2 + (targets.length * 32) + compressed.length);
    finalData[0] = MsgTypes.COMPRESSED;
    finalData[1] = targets.length;
    targets.forEach(({ id }, i) => {
      finalData.set(fromHex(id), 2 + (i * 32));
    });
    finalData.set(compressed, 2 + (targets.length * 32));
    return Promise.resolve(finalData);
  }
  return encryptRSA(compressed, pks)
    .then(([[iv, encrypted], wrappedKeys]) => {
      const ivRaw = fromBase64(iv); // 12 bytes
      const encryptedRaw = fromBase64(encrypted); // Rest
      // Assuming targets ids are 32 bytes hex encoded strings, and wrapped keys
      // 256 bytes each (2048 bit, depends on RSA key size)
      const finalData = new Uint8Array(
        2 + (wrappedKeys.length * (32 + 256)) + 12 + encryptedRaw.length,
      );
      finalData[0] = MsgTypes.ENCRYPTED;
      // This limits the number of targets (and paired devices) to 255
      finalData[1] = wrappedKeys.length;
      for (let i = 0; i < wrappedKeys.length; i += 1) {
        const start = 2 + (i * (32 + 256));
        finalData.set(fromHex(targets[i].id), start);
        finalData.set(fromBase64(wrappedKeys[i]), start + 32);
      }
      finalData.set(ivRaw, 2 + (wrappedKeys.length * (32 + 256)));
      finalData.set(encryptedRaw, 2 + (wrappedKeys.length * (32 + 256)) + 12);
      return finalData;
    });
}
function getMessageTargets(data) {
  if (data[0] === MsgTypes.COMPRESSED) {
    const numKeys = data[1];
    const wrappedKeys = [];
    for (let i = 0; i < numKeys; i += 1) {
      const start = 2 + (i * 32);
      const id = toHex(data.subarray(start, start + 32));
      wrappedKeys.push([id]);
    }
    return wrappedKeys;
  }
  const numKeys = data[1];
  const wrappedKeys = [];
  for (let i = 0; i < numKeys; i += 1) {
    const start = 2 + (i * (32 + 256));
    const id = toHex(data.subarray(start, start + 32));
    const wrappedKey = toBase64(data.subarray(start + 32, start + 32 + 256));
    wrappedKeys.push([id, wrappedKey]);
  }
  return wrappedKeys;
}
function decryptPairedMessage(data, deviceID, privateKey) {
  if (data[0] === MsgTypes.COMPRESSED) {
    const numKeys = data[1];
    return Promise.resolve()
      .then(() => JSON.parse(fromUTF8(inflate(data.subarray(2 + (numKeys * 32))))))
      .then(({ msg, type, source }) => ({ msg, type, source }));
  }
  const wrappedKeys = getMessageTargets(data);
  const end = 2 + (wrappedKeys.length * (32 + 256));
  const ivRaw = data.subarray(end, end + 12);
  const encryptedRaw = data.subarray(end + 12);
  const encrypted = [toBase64(ivRaw), toBase64(encryptedRaw)];
  const device = wrappedKeys.find(x => x[0] === deviceID);
  if (!device) {
    return Promise.reject(new Error('cannot find wrapped key when decrypting paired message'));
  }
  const wrappedKey = device[1];
  return decryptRSA([encrypted, wrappedKey], privateKey)
    .then(compressed => JSON.parse(fromUTF8(inflate(new Uint8Array(compressed)))))
    .then(({ msg, type, source }) => ({ msg, type, source }));
}

const ERRORS = {
  PAIRING_DEVICE_NAME_EXISTING: 'PAIRING_DEVICE_NAME_EXISTING',
  PAIRING_DEVICE_NAME_TOOLONG: 'PAIRING_DEVICE_NAME_TOOLONG',
  PAIRING_PUBLICKEY_MISMATCH: 'PAIRING_PUBLICKEY_MISMATCH',
  PAIRED_DECRYPTION_ERROR: 'PAIRED_DECRYPTION_ERROR',
  PAIRING_DEVICE_NAME_EMPTY: 'PAIRING_DEVICE_NAME_EMPTY',
};

const VERSION = 3;

// Wait! I can explain!
// Wanted to get rid of RSA crypto, but this is still needed for legacy devices,
// they use the recipient public key to send msg,s o we will send them this fixed RSA
// public key.
// RSA encryption was used because at some point we considered storing messages
// in mobile (encrypted) waiting to be delivered to the final destination (a different
// paired desktop), but now we only consider sending messages desktop<->mobile, and not
// storing them. If we are not storing the messages encryption is not needed since
// WebRTC already negotiates a secure TLS channel, which is good as long as the signaling
// messages are delivered securely (which they are now, encrypted end to end by a key derived
// from data contained in the QR code scanned by the mobile.
const dummyKeypair = Object.freeze([
  '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',
]);

export {
  ERRORS,
  encryptPairedMessage,
  decryptPairedMessage,
  getMessageTargets,
  dummyKeypair,
  VERSION
};
