import pacemaker from '../../core/services/pacemaker';

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

    this.initialized = false;
    this.interval = null;
    this.sleepTimeout = null;

    // Send signals by chunks, at regular intervals
    this.batchSize = config.get('signalQueue.batchSize'); // 5
    this.sendInterval = config.get('signalQueue.sendInterval'); // 15 * 1000;
    this.maxAttempts = config.get('signalQueue.maxAttempts'); // 5;

    // Current timeout that should be used after a failed batch
    this.failureTimeout = 1000 * 60;
  }

  init(db) {
    this.db = db;
    this.initialized = true;
    this.startListening();
  }

  unload() {
    logger.debug('unload signal queue');
    this.initialized = false;
    this.stopListening();

    pacemaker.clearTimeout(this.sleepTimeout);
    this.sleepTimeout = null;
  }

  getSize() {
    return this.db.getSize();
  }

  sleep(time) {
    return new Promise((resolve) => {
      logger.debug('signal queue sleeps for', time, 'ms');
      this.sleepTimeout = pacemaker.setTimeout(
        resolve,
        time,
      );
    });
  }

  /**
   * Send signals by batch.
   */
  startListening() {
    logger.debug('signal queue start listening');
    this.interval = pacemaker.register(
      async () => {
        // Only try to send a new batch if the signal queue is initialized
        if (this.initialized) {
          try {
            await this.processNextBatch(this.batchSize);
            // Reset failure timeout after we could send a batch successfuly
            this.failureTimeout = 1000 * 60;
          } catch (err) {
            if (this.initialized) {
              logger.debug('error while sending batch', err);
              // In case of error, sleep for longer and increase the timeout
              const timeout = this.failureTimeout;
              this.failureTimeout *= 5;
              await this.sleep(timeout);
            }
          }
        }
      },
      { timeout: this.sendInterval },
    );
  }

  stopListening() {
    pacemaker.clearTimeout(this.interval);
    this.interval = null;
  }

  /**
   * Try to send a given signal to the backend.
   *  - If it *succeeds*, then remove the document from the persistent queue.
   *  - If it *fails*, then increment the `attempts` counter. If the attempts is
   *  greater than the maximum allowed, we drop the message completely.
   */
  async sendSignal({ signal, attempts, id }, { force = false } = {}) {
    // Check if the message queue is currently initialized before sending anything
    // If `force` is specified, we by-pass this check and try to send anyway.
    if (!this.initialized && !force) {
      throw new Error('signal-queue has been unloaded, cancel message sending');
    }

    logger.debug('send signal', signal, { force });

    try {
      await this.backend.sendSignal(signal);
      if (this.db && id !== undefined && attempts !== undefined) {
        await this.db.remove(id);
      }
    } catch (ex) {
      const reason = `failed to send signal with exception ${ex} [${attempts}]`;

      if (this.db && id !== undefined && attempts !== undefined) {
        // Check number of attempts and remove if > this.maxAttempts
        if (attempts < this.maxAttempts) {
          await this.db.remove(id);
          await this.db.push(signal, attempts + 1);
          logger.debug('update number of attemps of signal', signal);
        } else {
          // Otherwise, remove the document from the queue
          await this.db.remove(id);
          logger.debug('removed failed signal', signal);
        }
      }

      // Notify failure
      throw new Error(reason);
    }
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
  async push(signal, { force = false } = {}) {
    try {
      await this.db.push(signal);
    } catch (ex) {
      logger.log('Could not persist signal in queue, sending directly', ex, signal);
      // Indicate that this signal was pushed directly, without going through
      // the persistent signal queue.

      /* eslint-disable no-param-reassign */
      signal.meta.forcePushed = true;
      /* eslint-enable no-param-reassign */
      await this.sendSignal({ signal }, { force });
    }
  }
}
