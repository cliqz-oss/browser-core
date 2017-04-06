/*
Function to create http url
*/

function createHttpUrl(host) {
  return 'http://' + host + '/verify';
}

/*
Converts given array to generator like object.
*/
function trkGen(_trk) {
  const trk = _trk;
  let idx = -1;
  return {
    next: function() {
      idx += 1;
      if (idx < trk.length) {
        return {
          value: idx, // Return the first yielded value.
          done: false,
        };
      } else {
        return {
          value: undefined, // Return undefined.
          done: true,
        };
      }
    },
  };
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}