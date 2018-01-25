/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

// copied and adapted from modules/pairing/crypto.es

/* eslint-disable camelcase */

import crypto from '../platform/crypto';
import { toUTF8 } from '../core/encoding';

export default class CliqzCrypto {
  /**
   * @return {Promise<ArrayBuffer>} will be fulfilled with an ArrayBuffer
   * containing the hashed String
   */
  static sha256(str) {
    return CliqzCrypto.hash('SHA-256', str);
  }

  static hash(algo, str) {
    return crypto.subtle.digest(algo, typeof str === 'string' ? toUTF8(str) : str);
  }

  static toUint32(arrayBuffer) {
    const first4Bytes = arrayBuffer.slice(4);
    return new Uint32Array(first4Bytes)[0];
  }
}
