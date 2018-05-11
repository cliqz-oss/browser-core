import config from '../core/config';

export default class HistoryWorker {
  constructor() {
    const workerPath = `${config.baseURL}history-analyzer/worker.bundle.js`;
    this.worker = new Worker(workerPath);
  }

  setOnmessageCb(fn) {
    this.worker.onmessage = fn;
  }

  postMessage(...args) {
    this.worker.postMessage(...args);
  }

  terminate() {
    this.worker.terminate();
  }
}
