export default function waitForAsync(fn, depth = 10, error) {
  if (depth <= 0) {
    return Promise.reject(error || 'waitForAsync max depth');
  }

  return Promise.resolve()
    .then(() => fn())
    .then((value) => {
      if (value) {
        return Promise.resolve(value);
      }
      return Promise.reject();
    })
    .catch((e) => {
      const err = e || error;
      return new Promise((resolve) => {
        setTimeout(
          () => {
            resolve(waitForAsync(fn, depth - 1, err));
          },
          100,
        );
      });
    });
}
