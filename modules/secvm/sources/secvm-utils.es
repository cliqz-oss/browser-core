/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import random from '../core/crypto/random';

const SecVmUtils = {

  Base64Alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  /**
   * @return random integer between min (inclusive) and max (exclusive)
   */
  getRandomInt(min, max) {
    // Math.round would give a non-uniform distribution
    return Math.floor(random() * ((max - min) + 1)) + min;
  },

  /**
   * @param {int} length the length of the string to be generated
   * @return {string} a string consisting of characters of the Base64 alphabet
   */
  getRandomBase64String(length) {
    return [...Array(length)].map(() =>
      SecVmUtils.Base64Alphabet.charAt(
        Math.floor(Math.random() * SecVmUtils.Base64Alphabet.length))
    ).join('');
  }
};

export default SecVmUtils;
