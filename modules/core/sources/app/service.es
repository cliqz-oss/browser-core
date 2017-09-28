import Defer from './defer';

export default class Service {
  constructor(initializer) {
    this._initializer = initializer;
  }

  /*
   * Service is initialized only once
   * Multiple calls to init return same promise
   */
  init() {
    if (this._readyDefer) {
      return this._readyDefer.promise;
    }

    this._readyDefer = new Defer();

    // wrap in promise to catch exceptions
    Promise.resolve()
      .then(() => this._initializer())
      .then(
        () => this._readyDefer.resolve(),
        (e) => {
          this._readyDefer.reject();
          throw e;
        }
      );

    return this._readyDefer.promise;
  }
}
