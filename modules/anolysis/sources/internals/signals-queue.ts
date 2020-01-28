/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// @ts-ignore
import pacemaker from '../../core/services/pacemaker';

import Backend from './backend-communication';
import logger from './logger';

import * as signals from './storage/types/signals-queue';
import { Config } from './config';
import { Signal } from './signal';
import { PacemakerTimeout } from './types';

/**
 * Messages to be sent are persisted on disk (e.g.: using Dexie or equivalent
 * depending on platform) to make sure we don't lose anything. When popped from
 * the queue, they are sent one by one to the backend. Only when the response
 * is 'ok' we remove the message from storage.
 *
 * [Storage] -> backend -> deleted from [Storage]
 *
 * The messages are sent by batch.
 *
 * A new batch should not be sent unless the previous batch is completely sent.
 * Moreover, signals should have a maximum number of retries and should be
 * dropped after a few trials.
 */
export default class SignalsQueue {
  private db: signals.Storage | null = null;
  private initialized: boolean = false;
  private interval: PacemakerTimeout | null = null;
  private sleepTimeout: PacemakerTimeout | null = null;

  // Current timeout that should be used after a failed batch
  private failureTimeout: number = 1000 * 60;

  private readonly batchSize: number;
  private readonly sendInterval: number;
  private readonly maxAttempts: number;

  private readonly backend: Backend;

  constructor(config: Config) {
    this.backend = new Backend(config);

    this.batchSize = config.queue.batchSize;
    this.sendInterval = config.queue.sendInterval;
    this.maxAttempts = config.queue.maxAttempts;
  }

  public init(db: signals.Storage): void {
    this.db = db;
    this.initialized = true;
    this.startListening();
  }

  public unload() {
    logger.debug('unload signal queue');
    this.initialized = false;
    this.stopListening();

    pacemaker.clearTimeout(this.sleepTimeout);
    this.sleepTimeout = null;
  }

  private sleep(time: number): Promise<void> {
    return new Promise(resolve => {
      logger.debug('signal queue sleeps for', time, 'ms');
      this.sleepTimeout = pacemaker.setTimeout(resolve, time);
    });
  }

  /**
   * Send signals by batch.
   */
  private startListening() {
    logger.debug('signal queue start listening');
    let sending = false;
    this.interval = pacemaker.register(
      async () => {
        // Only try to send a new batch if the signal queue is initialized and
        // we are not already sending a batch: this could happen if previous
        // batch is delayed by an amount of time longer than the pacemaker
        // interval.
        if (sending === false && this.initialized) {
          sending = true; // lock
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
          } finally {
            sending = false; // unlock
          }
        }
      },
      { timeout: this.sendInterval },
    );
  }

  private stopListening() {
    pacemaker.clearTimeout(this.interval);
    this.interval = null;
  }

  /**
   * Try to send a given signal to the backend.
   *  - If it *succeeds*, then remove the document from the persistent queue.
   *  - If it *fails*, then increment the `attempts` counter. If the attempts is
   *  greater than the maximum allowed, we drop the message completely.
   */
  private async sendSignal(
    {
      signal,
      attempts,
      id,
    }: { signal: signals.Entry['signal']; attempts: signals.Entry['attempts']; id?: number },
    { force = false } = {},
  ): Promise<void> {
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
  private async sendBatch(batch: signals.Entry[]): Promise<void> {
    if (batch.length !== 0) {
      // Try to send first signal, then send the rest.
      await this.sendSignal(batch.shift() as signals.Entry);
      await this.sendBatch(batch); // first element removed with `shift(...)`
    }
  }

  /**
   * Get the next batch of documents to be sent to the backend.
   */
  private async getNextBatch(n: number): Promise<signals.Entry[]> {
    if (this.db === null) {
      return [];
    }

    try {
      return await this.db.getN(n);
    } catch (ex) {
      logger.error('signal-queue could not get next batch', ex);
      return []; // Returns empty batch
    }
  }

  /**
   * Try to send a new batch of signals to the backend:
   * 1. Get a batch of signals from the queue
   * 2. Try to send it
   * 3. Sleep before next batch
   */
  private async processNextBatch(size: number): Promise<void> {
    await this.sendBatch(await this.getNextBatch(size));
  }

  private async forcePush(signal: Signal): Promise<void> {
    // Indicate that this signal was pushed directly, without going through the
    // persistent signal queue.
    signal.meta.forcePushed = true;
    await this.sendSignal({ signal, attempts: 0 }, { force: true });
  }

  /**
   * Push a new signal in the queue. It will be persisted and sent to the
   * backend as soon as possible.
   */
  public async push(signal: Signal, { force = false } = {}): Promise<void> {
    if (this.db === null || force === true) {
      return this.forcePush(signal);
    }

    try {
      await this.db.push(signal, 0);
    } catch (ex) {
      logger.log('Could not persist signal in queue, sending directly', ex, signal);
      return this.forcePush(signal);
    }
  }
}
