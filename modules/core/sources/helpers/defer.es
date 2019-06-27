const noop = () => {};
export default class Defer {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    // silence error logs in case the defer promise
    // gets rejected before it's consumed
    this.promise.catch(noop);
  }
}
