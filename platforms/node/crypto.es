/* eslint-disable no-bitwise */
export default {
  getRandomValues: (_arr) => {
    const array = _arr;
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 4294967296) >>> 0;
    }
    return array;
  }
};
/* eslint-enable no-bitwise */
