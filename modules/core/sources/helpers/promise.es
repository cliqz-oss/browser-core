Promise.hash = function hash(obj) {
  const keys = [];
  const promises = [];

  Object.keys(obj).forEach((key) => {
    keys.push(key);
    promises.push(obj[key]);
  });

  return Promise.all(promises)
    .then((results) => {
      const result = Object.create(null);
      for (let i = 0; i < results.length; i += 1) {
        result[keys[i]] = results[i];
      }
      return result;
    });
};

export default Promise;
