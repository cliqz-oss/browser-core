export default {
  getRandomValues: function(array) {
    for (let i=0; i<array.length; i++) {
      array[i] = Math.random();
    }
    return array;
  }
};
