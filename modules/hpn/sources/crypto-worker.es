import config from '../core/config';

class CryptoWorker {
  constructor() {
    this.worker = new Worker(`${config.baseURL}hpn/worker.bundle.js`);
  }

  set onmessage(fn) {
    this.worker.onmessage = fn;
  }

  postMessage(...args) {
    this.worker.postMessage(...args);
  }

  terminate() {
    this.worker.terminate();
  }
}

export default CryptoWorker;
