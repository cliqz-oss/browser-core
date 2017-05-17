import md5 from 'core/helpers/md5';
import { utils } from 'core/cliqz';

import Backend from 'anolysis/backend-communication';
import log from 'anolysis/logging';
import getSynchronizedDate, { DATE_FORMAT } from 'anolysis/synchronized-date';


export default class {
  constructor(storage) {
    this.storage = storage;

    // Send signals by chunks, at regular intervals
    // Make throughput customizable
    this.batchSize = 6;
    this.sendInterval = 15000;

    // Send signal by batch and make sure each message has been sent before
    // deleting from the persistent storage.
    this.interval = utils.setInterval(
        () => {
          this.processNextBatch(this.batchSize);
        },
        this.sendInterval,
    );
  }

  init() {
    return this.storage
      .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
      .catch(err => log(`error deleting old messages from queue: ${err}`));
  }

  unload() {
    utils.clearInterval(this.interval);
  }

  processNextBatch(size) {
    return this.getNextBatch(size)
      .then(batch => this.sendBatch(batch));
  }

  getNextBatch(size) {
    return this.storage.getN(size).catch(() => []);
  }

  sendSignal(doc) {
    const signal = doc.signal;
    if (signal !== undefined) {
      log(`send signal ${JSON.stringify(signal)}`);
      return Backend.sendSignal(signal)
        .then(() => this.storage.remove(doc).catch(() => { /* Ignore */ }))
        .catch((ex) => {
          // We don't remove the document from the db since it will be retried
          // later. This way we avoid loosing signals because of server's
          // errors.
          log(`failed to send signal with exception ${ex}`);
        });
    }

    return Promise.reject(`doc.signal is undefined: ${JSON.stringify(doc)}`);
  }

  sendBatch(batch) {
    if (batch.length > 0) {
      log(`get batch of ${batch.length}`);
    }

    return Promise.all(
      batch.map(doc => this.sendSignal(doc))
    );
  }

  push(signal) {
    return this.storage.put({ signal, type: 'anolysisSignal', _id: md5(JSON.stringify(signal)) })
      .then(() => this.storage.info());
  }
}
