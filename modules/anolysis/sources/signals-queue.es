import md5 from '../core/helpers/md5';
import { utils } from '../core/cliqz';

import Backend from './backend-communication';
import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';


/**
 * Messages to be sent are persisted in pouchDB to make sure we don't lose
 * anything. When popped from the queue, they are sent one by one to the backend.
 * Only when the response is 'ok' we remove the message from pouchDB.
 *
 * [pouchDB] -> backend -> deleted from [pouchDB]
 *
 * The messages are sent by batch.
 *
 * A new batch should not be sent unless the previous batch is completely sent.
 * Moreover, signals should have a maximum number of retries and should be
 * dropped after a few trials.
 */
export default class {
  constructor(storage) {
    this.storage = storage;

    // Send signals by chunks, at regular intervals
    // Make throughput customizable
    this.batchSize = 5;
    this.sendInterval = 15 * 1000;
    this.maxAttempts = 5;
    // Max throughput = 30 messages per minute

    // Current timeout that should be used after a failed batch
    this.failureTimeout = 1000 * 60;
  }

  init() {
    return this.storage
      .deleteByTimespan({ to: getSynchronizedDate().subtract(1, 'months').format(DATE_FORMAT) })
      .catch(err => logger.error(`error deleting old messages from queue: ${err}`))
      .then(() => {
        // Trigger sending of next batch
        this.startListening();
      });
  }

  unload() {
    utils.clearInterval(this.interval);
    utils.clearTimeout(this.sleepTimeout);
  }

  /**
   * Destroy the storage used to persist the signal queue.
   */
  destroy() {
    return this.storage.destroy();
  }

  sleep(time) {
    return new Promise((resolve) => {
      logger.debug(`signal queue sleeps for ${time} ms`);
      this.sleepTimeout = utils.setTimeout(
        resolve,
        time,
      );
    });
  }

  /**
   * Send signals by batch.
   */
  startListening() {
    let previousBatch = Promise.resolve();
    this.interval = utils.setInterval(
      () => {
        previousBatch = previousBatch
          .then(() => this.processNextBatch(this.batchSize))
          .then(() => {
            // Reset failure timeout after we could send a batch successfuly
            this.failureTimeout = 1000 * 60;
            // Wait a bit before next batch
            return this.sleep(this.sendInterval);
          })
          .catch((err) => {
            logger.error(`error while sending batch ${err}`);
            // In case of error, sleep for longer and increase the timeout
            const timeout = this.failureTimeout;
            this.failureTimeout *= 5;
            return this.sleep(timeout);
          });
      },
      this.sendInterval,
    );
  }

  /**
   * Try to send a new batch of signals to the backend:
   * 1. Get a batch of signals from the queue
   * 2. Try to send it
   * 3. Sleep before next batch
   */
  processNextBatch(size) {
    return this.getNextBatch(size)
      .then(batch => this.sendBatch(batch));
  }


  /**
   * Get the next batch of documents to be sent to the backend.
   */
  getNextBatch(size) {
    return this.storage.getN(size).catch(() => []);
  }

  /**
   * Given a batch of signals to be sent, try to send them one by one but stop
   * as soon as we have a failure.
   */
  sendBatch(batch) {
    if (batch.length > 0) {
      // Try to send first signal, then send the rest.
      const doc = batch[0];
      return this.sendSignal(doc)
        .then(() => this.sendBatch(batch.slice(1)));
    }

    return Promise.resolve();
  }

  /**
   * Try to send a given signal to the backend.
   *  - If it *succeeds*, then remove the document from the persistent queue.
   *  - If it *fails*, then increment the `attempts` counter. If the attempts is
   *  greater than the maximum allowed, we drop the message completely.
   */
  sendSignal(doc) {
    const signal = doc.signal;

    if (signal !== undefined) {
      logger.debug(`send signal ${JSON.stringify(signal)}`);
      return Backend.sendSignal(signal)
        .then(() => this.storage.remove(doc).catch(() => { /* Ignore */ }))
        .catch((ex) => {
          // We don't remove the document from the db since it will be retried
          // later. This way we avoid loosing signals because of server's
          // errors.
          const reason = `failed to send signal with exception ${ex} [${doc.attempts}]`;
          let resultPromise;

          // Check number of attempts and remove if >= 3
          if (doc.attempts !== undefined && doc.attempts < this.maxAttempts) {
            /* eslint-disable no-param-reassign */
            doc.attempts += 1;
            resultPromise = this.storage.put(doc);
          } else {
            // Otherwise, remove the document from the queue
            resultPromise = this.storage.remove(doc)
              .catch(() => logger.error(`could not remove failed signal ${JSON.stringify(doc)}`))
              .then(() => logger.error(`removed failed signal ${JSON.stringify(doc)}`));
          }

          // Returns a failed promise to notify a failure
          return resultPromise.then(() => Promise.reject(reason));
        });
    }

    // If signal was undefined, remove the document from the queue
    return this.storage.remove(doc)
      .catch(() => {})
      .then(() => Promise.reject(`doc.signal is undefined: ${JSON.stringify(doc)}`));
  }

  /**
   * Push a new signal in the queue. It will be persisted and sent to the
   * backend as soon as possible.
   */
  push(signal) {
    return this.storage.put({
      signal,
      attempts: 0,
      type: 'anolysisSignal',
      _id: md5(JSON.stringify(signal))
    });
  }
}
