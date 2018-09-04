/* eslint-disable no-bitwise */

import BigInt from 'BigInt';

import {
  fromBase64,
  toUTF8,
  toHex,
} from '../../core/encoding';

import crypto from '../../platform/crypto';

function base64UrlDecode(_str) {
  const str = atob(_str.replace(/-/g, '+').replace(/_/g, '/'));
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}

function add(x, y) {
  const lenX = x.length;
  const lenY = y.length;
  let posX = lenX - 1;
  let posY = lenY - 1;
  const charCode0 = '0'.charCodeAt(0);

  let carry = 0;
  const result = [];
  while (posX >= 0 && posY >= 0) {
    const currX = x.charCodeAt(posX) - charCode0;
    const currY = y.charCodeAt(posY) - charCode0;
    const s = currX + currY + carry;
    posX -= 1;
    posY -= 1;

    result.unshift(s < 10 ? s : s - 10);
    carry = s < 10 ? 0 : 1;
  }

  while (posX >= 0) {
    const currX = x.charCodeAt(posX) - charCode0;
    const s = currX + carry;
    posX -= 1;

    result.unshift(s < 10 ? s : s - 10);
    carry = s < 10 ? 0 : 1;
  }

  while (posY >= 0) {
    const currY = y.charCodeAt(posY) - charCode0;
    const s = currY + carry;
    posY -= 1;

    result.unshift(s < 10 ? s : s - 10);
    carry = s < 10 ? 0 : 1;
  }

  if (carry) {
    result.unshift(carry);
  }
  return result.join('');
}

export function h2d(s) {
  let dec = '0';
  const len = s.length;
  for (let i = 0; i < len; i += 1) {
    const chr = s.charAt(i);
    const n = parseInt(chr, 16);
    for (let t = 8; t; t >>= 1) {
      dec = add(dec, dec);
      if (n & t) {
        dec = add(dec, '1');
      }
    }
  }
  return dec;
}

export function parseDSKey(pubKeyB64) {
  // Parse key contents.
  return crypto.subtle.importKey(
    'spki',
    fromBase64(pubKeyB64),
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-1' }
    },
    true,
    ['encrypt']
  )
    .then(key => crypto.subtle.exportKey('jwk', key))
    .then((key) => {
      // base64url-decode modulus
      const modulus = base64UrlDecode(key.n);
      // base64url-decode exponent
      const exponent = base64UrlDecode(key.e);
      // modulus and exponent are now Uint8Arrays
      return { n: h2d(toHex(modulus)), e: `${h2d(toHex(exponent))}` };
    });
}

export function unBlindMessage(blindSignedMessage, unBlinder, n) {
  // Unblind the message before sending it for verification.
  // s = u*(bs) mod n
  const _us = BigInt.multMod(
    unBlinder,
    BigInt.str2bigInt(blindSignedMessage, 16),
    BigInt.str2bigInt(n, 10)
  );
  const us = BigInt.bigInt2str(_us, 10, 0);
  return us;
}

// Set the context for blind signatures right.
export class blindSignContext {
  constructor(msg, logger = { log: () => {}, error: () => {} }) {
    /*
    Initialize it with the following:
    1. Signer Public Key
    2. Signer Public Exponent
    3. Signer Public Modulous
    */

    // this.keyObj = new JSEncrypt();
    this.randomNumber = null;
    this.blindingNonce = null;
    this.blinder = null;
    this.unblinder = null;
    this.keySize = 2048;
    this.hashedMessage = '';
    this.bm = '';
    this.signedMessage = '';
    this.msg = msg;
    this.logger = logger;
  }

  exponent() {
    // Return the public exponent
    return this.e;
  }

  modulus() {
    return this.n;
  }

  log(msg) {
    this.logger.log(msg, 'Blind Signature');
  }

  error(...args) {
    this.logger.error(...args);
  }

  hashMessage() {
    // Need sha256 digest the message.
    return crypto.subtle.digest('SHA-256', toUTF8(this.msg)).then(toHex);
  }

  getBlindingNonce() {
    // Create a random value.
    const randomHex = toHex(crypto.getRandomValues(new Uint8Array(this.keySize / 8)));
    const randomNumber = BigInt.str2bigInt(randomHex, 16);
    this.blindingNonce = randomNumber;
    return randomNumber;
  }

  getBlinder(e, n) {
    // Calculate blinder.
    // b = r ^ e mod n
    const b = BigInt.powMod(
      this.blindingNonce,
      BigInt.str2bigInt(e, 10),
      BigInt.str2bigInt(n, 10)
    );
    this.blinder = b;
    return b;
  }

  getUnBlinder(n) {
    // Calculate blinder.
    // b = r ^ e mod n
    const u = BigInt.inverseMod(
      this.blindingNonce,
      BigInt.str2bigInt(n, 10)
    );
    this.unblinder = u;
    return u;
  }

  blindMessage(e, n) {
    // Blind the message before sending it for signing.
    // bm = b*m mod n
    const promise = new Promise((resolve, /* reject */) => {
      this.hashMessage().then((hashMessage) => {
        // var rnd = this.getBlindingNonce();
        const blinder = this.getBlinder(e, n);
        const bm = BigInt.multMod(
          blinder,
          BigInt.str2bigInt(hashMessage, 16),
          BigInt.str2bigInt(n, 10)
        );
        this.bm = BigInt.bigInt2str(bm, 10);
        resolve(this.bm);
      });
    });
    return promise;
  }

  verify() {
    // Verify the message to see, the signer is not the problem.
    // m = s^e mod n
    return new Promise((resolve, /* reject */) => {
      const messageSigned = BigInt.bigInt2str(
        BigInt.powMod(
          BigInt.str2bigInt(this.signedMessage, 10, 0),
          BigInt.str2bigInt(this.e, 10),
          BigInt.str2bigInt(this.n, 10)
        ),
        10
      );
      const originalMessage = BigInt.bigInt2str(
        BigInt.str2bigInt(this.hashedMessage, 16),
        10
      );
      // var original_message = _this.hashedMessage;
      this.log(`Org message ${originalMessage}`);
      this.log(`Sign message: ${messageSigned}`);
      if (originalMessage === messageSigned.toLowerCase()) {
        resolve(true);
      } else {
        // Need to replace this with reject.
        resolve(false);
      }
    });
  }
}
