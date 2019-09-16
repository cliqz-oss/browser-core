/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { promiseHttpHandler } from '../core/http';
import config from '../core/config';
import inject from '../core/kord/inject';
import logger from './logger';
import prefs from '../core/prefs';
import events from '../core/events';
import pacemaker from '../core/services/pacemaker';

/**
 * Number of messages that we store in the history. By default,
 * this feature is turned off (length will be 0), except in
 * developer mode.
 */
function getDefaultHistoryLimit() {
  let limit;
  if (prefs.has('human-web.history')) {
    limit = parseInt(prefs.get('human-web.history'), 10);
  } else if (prefs.get('developer', false)) {
    limit = 32;
  }
  return limit || 0;
}

class Hpnv2Sender {
  constructor(pushToDlq) {
    this.pushToDlq = pushToDlq;
    this.hpnv2 = inject.module('hpnv2');
  }

  init() {}

  unload() {}

  send(msg, prevAttempts) {
    return new Promise((resolve, reject) => {
      this.hpnv2.action('telemetry', msg)
        .then(resolve)
        .catch((e) => {
          const attempts = prevAttempts.attempts || 0;
          const shouldRetry = !e.isPermanentHpnv2Error
            && (e.isRecoverableHpnv2Error || attempts === 0);
          if (shouldRetry) {
            logger.debug('message failed, retry possible --> pushing to DLQ', msg);
            this.pushToDlq([{ msg, resolve, reject, attempts, e }]);
          } else {
            logger.debug('message failed, retry will likely fail --> dropping message', msg);
            reject(e);
          }
        });
    });
  }
}

class HttpFallback {
  constructor(pushToDlq) {
    this.pushToDlq = pushToDlq;
    this.batchSize = 100;
    this.trk = [];
  }

  init() {
    this.installHttpSendCallback();
  }

  unload() {
    pacemaker.clearTimeout(this.trkTimer);
    this.trkTimer = null;

    const unsentMessages = this.trk;
    this.trk = [];
    this.pushToDlq(unsentMessages);
  }

  installHttpSendCallback() {
    pacemaker.clearTimeout(this.trkTimer);
    if (this.trk.length > 0) {
      this.trkTimer = pacemaker.setTimeout(() => this.flushSendQueue(), 60000);
    }
  }

  send(msg, instantPush, prevAttempts) {
    return new Promise((resolve, reject) => {
      this.trk.push({ msg, resolve, reject, attempts: prevAttempts.attempts, e: prevAttempts.e });
      if (instantPush || this.trk.length >= this.batchSize) {
        this.flushSendQueue();
      } else {
        this.installHttpSendCallback();
      }
    });
  }

  flushSendQueue() {
    const batch = this.trk;
    this.trk = [];

    const data = JSON.stringify(batch.map(x => x.msg));
    promiseHttpHandler('POST', config.settings.SAFE_BROWSING, data, 60000, true)
      .then(() => {
        for (const { resolve } of batch) {
          resolve();
        }
      }).catch((e) => {
        /* eslint-disable no-param-reassign */
        batch.forEach((x) => { x.e = e; });
        this.pushToDlq(batch);
      });
  }
}

class History {
  constructor({ length }) {
    this.history = [];
    this.sent = 0;
    this.resize(length);
  }

  resize(newLength) {
    if (newLength !== this.history.length) {
      const old = this.values();
      this.history = [...new Array(newLength)];
      this.sent = 0;
      old.forEach(({ msg, sentAt }) => this.push(msg, sentAt));
    }
  }

  clear() {
    this.sent = 0;
    this.history.fill(undefined);
  }

  push(msg, sentAt = new Date()) {
    if (this.history.length > 0) {
      this.history[this.sent % this.history.length] = { msg, sentAt };
    }
    this.sent += 1;
  }

  values() {
    const len = this.history.length;
    if (len === 0) {
      return [];
    }
    const pos = this.sent % len;
    return this.history.slice(pos, len).filter(x => x).concat(this.history.slice(0, pos));
  }
}

export default class SafebrowsingEndpoint {
  constructor() {
    const pushToDlq = (...args) => this.pushToDlq(...args);
    this.hpnv2Sender = new Hpnv2Sender(pushToDlq);
    this.httpFallback = new HttpFallback(pushToDlq);
    this.dlq = [];
    this.dlqMaxSize = 200;
    this.dlqMaxAttempts = 10;
    this.loaded = false;

    // (will be initialized later when we have reliable access to the prefs)
    this.history = new History({ length: 0 });
  }

  init() {
    this.history = new History({ length: getDefaultHistoryLimit() });
    this.hpnv2 = inject.module('hpnv2');
    this.hpnv2Sender.init();
    this.httpFallback.init();
    this.loaded = true;

    this.pending = new Map();
  }

  unload() {
    if (this.loaded) {
      this.loaded = false;
      this.hpnv2Sender.unload();
      this.httpFallback.unload();

      this.pending.clear();
      this.history.clear();
    }
  }

  async send(msg, { instantPush = false } = {}) {
    await this._send(msg, { instantPush });
  }

  /**
   * Shows all messages that are waiting to be sent.
   * There is no strict guarantee, but it is approximately a FIFO queue.
   */
  getSendQueue() {
    return [...this.pending.values()].reverse().concat(this.dlq.map(x => x.msg));
  }

  async _send(msg, { instantPush = false, prevAttempts = {} }) {
    const id = {};
    this.pending.set(id, msg);
    try {
      if (this.loaded) {
        if (this.hpnv2.isEnabled()) {
          await this.hpnv2Sender.send(msg, prevAttempts);
        } else {
          // fallback to http (for mobile)
          if (this.hpnv2.isPresent()) {
            logger.warn('HPN disabled. Fallback back to http.');
          }
          await this.httpFallback.send(msg, instantPush, prevAttempts);
        }
      } else {
        await new Promise((resolve, reject) => {
          this.pushToDlq([{
            msg,
            resolve,
            reject,
            attempts: prevAttempts.attempts || 0,
            e: prevAttempts.e,
          }]);
        });
      }
      this.pending.delete(id);
      this.history.push(msg);
      events.pub('human-web:signal-sent', msg);

      // We just successfully sent a message.
      // Should be a good time to make attempts at clearing the DLQ.
      this.clearDlq();
    } catch (e) {
      this.pending.delete(id);
      throw e;
    }
  }

  pushToDlq(messages) {
    for (const message of messages) {
      message.attempts = (message.attempts || 0) + 1;
      if (message.attempts <= this.dlqMaxAttempts) {
        this.dlq.push(message);
      } else {
        logger.warn('Too many failures. Dropping message:', message.msg);
        message.reject(message.e);
      }
    }

    if (this.dlq.length > this.dlqMaxSize) {
      for (const { msg, reject, e } of this.dlq.splice(0, this.dlq.length - this.dlqMaxSize)) {
        logger.warn('DLQ overrun. Dropping message:', msg);
        reject(e);
      }
    }
  }

  clearDlq(maxElemsToRetry = 2) {
    if (!this.loaded) {
      return;
    }

    for (const message of this.dlq.splice(0, maxElemsToRetry)) {
      const { msg, resolve, reject, attempts, e } = message;
      logger.debug('Trying to resend message from DLQ:', msg);
      const prevAttempts = { attempts, e };
      this._send(msg, { prevAttempts }).then(() => {
        resolve();

        // again successful, continue clearing
        // (if maxElemsToRetry > 1, the cleanup rate will exponentially speed up)
        this.clearDlq(maxElemsToRetry);
      }).catch(reject);
    }
  }

  flushSendQueue() {
    this.clearDlq(this.dlq.length);
    this.httpFallback.flushSendQueue();
  }
}
