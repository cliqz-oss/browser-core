const testIntervals = [];


function registerInterval(interval) {
  testIntervals.push(interval);
}


function clearIntervals() {
  testIntervals.forEach(window.clearInterval);
}


function waitFor(fn) {
  var resolver, rejecter, promise = new Promise(function (res, rej) {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    if (fn()) {
      clearInterval(interval);
      resolver()
    }
  }
  var interval = setInterval(check, 250);
  check();
  registerInterval(interval);

  return promise;
}


function waitForAsync(fn) {
  return fn()
    .then((value) => {
      if (value) {
        return Promise.resolve();
      }
      return Promise.reject();
    })
    .catch(() => new Promise((resolve) => {
      setTimeout(
        () => {
          resolve(waitForAsync(fn));
        },
        250
      );
    }));
}


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
