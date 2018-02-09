export default {
  getRandomValues: function(array) {
    for (let i=0; i<array.length; i++) {
      array[i] = Math.floor(Math.random() * 4294967296) >>> 0;
    }
    return array;
  }
};
