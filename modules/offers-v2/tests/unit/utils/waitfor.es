/**
 * Repeatedly call `func` until it succeeds or timeout `ms` happens.
 * Timestamps for checks are 0ms, 5ms, 8ms, 13ms, 21ms, 34ms etc.
 * Call is successful if `func` returns a truthy value or `undefined`.
 *
 * The reason behind truthy `undefined` is the use of assertions:
 * ```
 * await waitFor(() =>
 *   chai.expect(asyncVar).to.eql(1, 'initialized'));
 * ```
 *
 * Use assertions whenever possible. Otherwise, provide `message` to
 * give the user a hint in case of timeout.
 * ```
 * await waitFor(
 *   () => asyncVar === 1,
 *   'initialized'
 * );
 * ```
 *
 * @function waitFor
 * @param {(...args) => (bool|void)} func
 * @param {string} message
 * @param {number} ms
 * @returns {Promise<any>}
 */
function waitFor(func, message = '', ms = 500) {
  let waitTotal = 0;
  let interval = 5;
  let nextInterval = 8;
  // Provide a context information to the user in case of timeout
  const stack = (new Error()).stack;

  return new Promise((resolve, reject) => {
    const next = () => {
      let err = null;
      try {
        //
        // Do the check
        // Finish on success
        //
        let check = func();

        if (check === undefined) { // chai assertion
          check = true;
        }
        if (check) {
          resolve(check);
          return;
        }
      } catch (e) {
        err = e;
      }

      //
      // Timeout
      // Finish with error
      //
      if (waitTotal > ms) {
        if (!err) {
          err = `waitFor over ${ms} milliseconds`;
          if (message) {
            err = `${err}: ${message}`;
          }
          err = `${err}\n${stack}`;
          err = new Error(err);
        }
        reject(err);
        return;
      }

      //
      // Continue waiting
      //
      waitTotal += interval;
      const tmp = interval;
      interval = nextInterval;
      nextInterval = interval + tmp;
      setTimeout(next, interval);
    };

    //
    // Start the waiting loop
    //
    next();
  });
}

module.exports = waitFor;
