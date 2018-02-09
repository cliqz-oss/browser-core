/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

/**
 * Switches from big-endian to little-endian and vice versa.
 * @param {Uint8Array} array an Uint8Array array obtained from an array
 * consisting of 4-byte values
 * @return {Uint8Array} the same array, now with swtiched endianness
 */
export default function switchEndianness4Byte(array) {
  const switchedArray = array;
  const end = switchedArray.length / 4;
  for (let i = 0; i < end; i += 1) {
    const startCurr4Bytes = 4 * i;
    let tmp = switchedArray[startCurr4Bytes];
    switchedArray[startCurr4Bytes] = switchedArray[startCurr4Bytes + 3];
    switchedArray[startCurr4Bytes + 3] = tmp;
    tmp = switchedArray[startCurr4Bytes + 1];
    switchedArray[startCurr4Bytes + 1] = switchedArray[startCurr4Bytes + 2];
    switchedArray[startCurr4Bytes + 2] = tmp;
  }

  return switchedArray;
}
