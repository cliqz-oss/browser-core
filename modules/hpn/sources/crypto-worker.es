import config from '../core/config';
import Worker from '../platform/worker';

class CryptoWorker {
  // the name is optional (it is only relevant for debugging)
  constructor(name) {
    this.worker = new Worker(`${config.baseURL}hpn/worker.bundle.js?name=${name || ''}`, { name });
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
