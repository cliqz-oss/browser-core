import utils from '../../core/utils';

import Backend from './backend-communication';
import logger from './logger';


/**
 * Messages to be sent are persisted in Dexie to make sure we don't lose
 * anything. When popped from the queue, they are sent one by one to the backend.
 * Only when the response is 'ok' we remove the message from Dexie.
 *
 * [Dexie] -> backend -> deleted from [Dexie]
 *
 * The messages are sent by batch.
 *
 * A new batch should not be sent unless the previous batch is completely sent.
 * Moreover, signals should have a maximum number of retries and should be
 * dropped after a few trials.
 */
export default class SignalsQueue {
  constructor(config) {
    this.db = null;
    this.backend = new Backend(config);

    // Send signals by chunks, at regular intervals
    // Make throughput customizable
    this.initialized = false;

    this.batchSize = config.get('signalQueue.batchSize'); // 5
    this.sendInterval = config.get('signalQueue.sendInterval'); // 15 * 1000;
    this.maxAttempts = config.get('signalQueue.maxAttempts'); // 5;

    // Current timeout that should be used after a failed batch
    this.failureTimeout = 1000 * 60;
  }

  init(db) {
    this.db = db;
    return this.startListening();
  }

  unload() {
    this.initialized = false;
    utils.clearInterval(this.interval);
    utils.clearTimeout(this.sleepTimeout);
  }

  getSize() {
    return this.db.getSize();
  }

  sleep(time) {
    return new Promise((resolve) => {
      logger.debug('signal queue sleeps for', time, 'ms');
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
    let ongoingBatch = false;
    this.initialized = true;
    this.interval = utils.setInterval(
      () => {
        // Only try to send a new batch if the signal queue is initialized and
        // we are not already sending a batch
        if (!ongoingBatch && this.initialized) {
          ongoingBatch = true;
          this.processNextBatch(this.batchSize)
            .then(() => {
              // Reset failure timeout after we could send a batch successfuly
              this.failureTimeout = 1000 * 60;
              // Wait a bit before next batch
              return this.sleep(this.sendInterval);
            })
            .catch((err) => {
              if (this.initialized) {
                logger.error('error while sending batch', err);
                // In case of error, sleep for longer and increase the timeout
                const timeout = this.failureTimeout;
                this.failureTimeout *= 5;
                return this.sleep(timeout);
              }

              return Promise.resolve();
            })
            .catch(() => {})
            .then(() => { ongoingBatch = false; });
        }
      },
      this.sendInterval,
    );
  }

  /**
   * Try to send a given signal to the backend.
   *  - If it *succeeds*, then remove the document from the persistent queue.
   *  - If it *fails*, then increment the `attempts` counter. If the attempts is
   *  greater than the maximum allowed, we drop the message completely.
   */
  sendSignal({ signal, attempts, id }) {
    // Check if the message queue is currently initialized before sending anything
    if (!this.initialized) {
      return Promise.reject('signal-queue has been unloaded, cancel message sending');
    }

    logger.debug('send signal', signal);
    return this.backend.sendSignal(signal)
      .then(() => this.db.remove(id))
      .catch((ex) => {
        // We don't remove the document from the db since it will be retried
        // later. This way we avoid loosing signals because of server's
        // errors.
        const reason = `failed to send signal with exception ${ex} [${attempts}]`;
        let resultPromise;

        // Check number of attempts and remove if > this.maxAttempts
        if (attempts < this.maxAttempts) {
          resultPromise = this.db.remove(id)
            .then(() => this.db.push(signal, attempts + 1))
            .then(() => logger.error('update number of attemps of signal', signal));
        } else {
          // Otherwise, remove the document from the queue
          resultPromise = this.db.remove(id)
            .then(() => logger.error('removed failed signal', signal));
        }

        // Returns a failed promise to notify a failure
        return resultPromise.then(() => Promise.reject(reason));
      });
  }

  /**
   * Given a batch of signals to be sent, try to send them one by one but stop
   * as soon as we have a failure.
   */
  sendBatch(batch) {
    if (batch && batch.length > 0) {
      // Try to send first signal, then send the rest.
      const doc = batch[0];
      return this.sendSignal(doc)
        .then(() => this.sendBatch(batch.slice(1)));
    }

    return Promise.resolve();
  }

  /**
   * Get the next batch of documents to be sent to the backend.
   */
  getNextBatch(n) {
    return this.db.getN(n)
      .catch((ex) => {
        logger.error('signal-queue could not get next batch', ex);
        return []; // Returns empty batch
      });
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
   * Push a new signal in the queue. It will be persisted and sent to the
   * backend as soon as possible.
   */
  push(signal) {
    return this.db.push(signal).catch((ex) => {
      logger.log('Could not persist signal in queue, sending directly', ex, signal);
      // Indicate that this signal was pushed directly, without going through
      // the persistent signal queue.

      /* eslint-disable no-param-reassign */
      signal.meta.forcePushed = true;
      /* eslint-enable no-param-reassign */
      return this.sendSignal({ signal });
    });
  }
}
