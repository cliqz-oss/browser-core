/**
 * @class ThrottleError
 */
export class ThrottleError extends Error { }

/**
 * @method isThrottleError
 * @param {Error} err
 * @return {boolean}
 */
export function isThrottleError(err) {
  // not 'err instanceof ThrottleError': visibility error after transpiling
  return err.constructor.name === 'ThrottleError';
}

/**
 * Force an interval between executions. If a task comes too early,
 * it is rejected.
 *
 * @class ThrottleWithRejection
 */
export class ThrottleWithRejection {
  constructor(throttleIntervalSec) {
    this.throttleIntervalMs = throttleIntervalSec * 1000;
    this.reset();
  }

  // Used also from test code
  reset() {
    this.isExecuting = false;
    this.lastExecutionMs = 0;
  }

  /**
   * @method executeAsync
   * @param {(*[]) => Promise<*>} fn  callable object returning a Promise
   * @param {*[]} args
   * @returns Promise<*>
   */
  async executeAsync(fn, ...args) {
    //
    // Throttle
    //
    const nowMs = Date.now();
    if ((nowMs - this.lastExecutionMs < this.throttleIntervalMs)
      || this.isExecuting
    ) {
      throw new ThrottleError(`Executed too frequently: ${fn.name}`);
    }
    //
    // Execute
    //
    this.isExecuting = true;
    try {
      return await fn(...args);
    } finally {
      this.lastExecutionMs = Date.now();
      this.isExecuting = false;
    }
  }
}
